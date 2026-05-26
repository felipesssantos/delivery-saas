import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * Uber Direct Webhook Receiver
 * 
 * Receives delivery status updates and courier location updates.
 * Must respond with 200 OK or Uber will retry.
 */
export async function POST(request: Request) {
  try {
    const payload = await request.json();
    
    console.log("[UberWebhook] Received event:", payload.event_type, payload.meta?.resource_id);

    const eventType = payload.event_type;
    const deliveryId = payload.meta?.resource_id || payload.data?.id;

    if (!deliveryId) {
      console.error("[UberWebhook] No delivery ID in payload");
      return NextResponse.json({ ok: true });
    }

    // Find the order with this Uber delivery ID
    const order = await prisma.order.findFirst({
      where: { uberDeliveryId: deliveryId },
      include: {
        customer: true,
        store: { select: { name: true, id: true } },
      },
    });

    if (!order) {
      console.warn(`[UberWebhook] No order found for delivery ${deliveryId}`);
      return NextResponse.json({ ok: true });
    }

    const code = order.id.slice(-6).toUpperCase();

    if (eventType === "event.delivery_status") {
      const status = payload.data?.status;
      console.log(`[UberWebhook] Delivery ${deliveryId} status: ${status}`);

      switch (status) {
        case "pickup":
          // Courier is heading to pickup / at pickup
          if (order.status !== "DISPATCHED") {
            await prisma.order.update({
              where: { id: order.id },
              data: { status: "DISPATCHED" },
            });
          }
          break;

        case "dropoff":
          // Courier is heading to customer
          // Keep as DISPATCHED, no change needed
          break;

        case "delivered":
          await prisma.order.update({
            where: { id: order.id },
            data: { status: "DELIVERED" },
          });
          // Notify customer
          await notifyWhatsApp(order.store.id, order.customer.phone,
            `📋 *Pedido #${code} — ${order.store.name}*\n\n🎉 Seu pedido foi *entregue*! Obrigado pela preferência! ❤️`
          );
          break;

        case "canceled":
        case "returned":
          console.warn(`[UberWebhook] Delivery ${deliveryId} was ${status}`);
          // Notify store via a log - the store will see it in the dashboard on next refresh
          break;
      }
    }

    if (eventType === "event.courier_update") {
      // Courier location update (every ~20 seconds)
      // We could store lat/lng for live tracking, but for now just log
      const lat = payload.data?.courier?.location?.lat;
      const lng = payload.data?.courier?.location?.lng;
      if (lat && lng) {
        console.log(`[UberWebhook] Courier location for ${deliveryId}: ${lat}, ${lng}`);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[UberWebhook] Error processing webhook:", err);
    // Always return 200 to prevent Uber from retrying on our errors
    return NextResponse.json({ ok: true });
  }
}

/**
 * Helper: send WhatsApp message (fire-and-forget)
 */
async function notifyWhatsApp(storeId: string, phone: string, message: string) {
  try {
    const WA_URL = process.env.WHATSAPP_SERVICE_URL || "http://localhost:3001";
    const API_SECRET = process.env.API_SECRET || "";

    await fetch(`${WA_URL}/api/send-message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId, toPhone: phone, message, secret: API_SECRET }),
    });
  } catch (err) {
    console.error("[UberWebhook] WhatsApp notification failed:", err);
  }
}
