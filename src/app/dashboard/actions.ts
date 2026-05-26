"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { createQuote, createDelivery, cancelDelivery } from "@/lib/uber-direct";

const WA_URL = process.env.WHATSAPP_SERVICE_URL || "http://localhost:3001";
const API_SECRET = process.env.API_SECRET || "";

// Helper to send WhatsApp message (fire-and-forget)
async function sendWhatsApp(storeId: string, toPhone: string, message: string) {
  try {
    await fetch(`${WA_URL}/api/send-message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId, toPhone, message, secret: API_SECRET }),
    });
  } catch (err) {
    console.error("WhatsApp send failed:", err);
  }
}

// Status labels for customer notifications
const STATUS_MESSAGES: Record<string, string> = {
  ACCEPTED: "✅ Seu pedido foi *aceito* pela loja! Em breve começaremos a preparar.",
  PREPARING: "👨‍🍳 Seu pedido está sendo *preparado*!",
  READY: "📦 Seu pedido está *pronto* e aguardando o entregador!",
  DISPATCHED: "🏍️ Seu pedido *saiu para entrega*! Fique de olho!",
  DELIVERED: "🎉 Seu pedido foi *entregue*! Obrigado pela preferência! ❤️",
  CANCELED: "❌ Infelizmente seu pedido foi *cancelado*.",
};

export async function updateOrderStatus(orderId: string, status: string) {
  const session = await auth();
  const storeId = (session?.user as any)?.storeId;
  if (!storeId) throw new Error("Não autorizado");

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { customer: true, store: { select: { name: true } } },
  });
  if (order?.storeId !== storeId) throw new Error("Não autorizado");

  await prisma.order.update({
    where: { id: orderId },
    data: { status: status as any },
  });

  const statusMsg = STATUS_MESSAGES[status];
  if (statusMsg && order.customer.phone) {
    const code = order.id.slice(-6).toUpperCase();
    const msg = `📋 *Pedido #${code} — ${order.store.name}*\n\n${statusMsg}`;
    sendWhatsApp(storeId, order.customer.phone, msg);
  }

  revalidatePath("/dashboard");
}

export async function assignCourierAndDispatch(orderId: string, courierId: string) {
  const session = await auth();
  const storeId = (session?.user as any)?.storeId;
  if (!storeId) throw new Error("Não autorizado");

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: true,
      store: { select: { name: true } },
      items: { include: { product: { select: { name: true } } } },
    },
  });
  if (order?.storeId !== storeId) throw new Error("Não autorizado");

  const courier = await prisma.courier.findUnique({ where: { id: courierId } });
  if (!courier || courier.storeId !== storeId) throw new Error("Entregador não encontrado");

  await prisma.order.update({
    where: { id: orderId },
    data: { courierId, status: "DISPATCHED" },
  });

  const code = order.id.slice(-6).toUpperCase();
  const itemsText = order.items.map(i => `  • ${i.quantity}x ${i.product.name}`).join("\n");

  let courierMsg = `🏍️ *NOVA ENTREGA — Pedido #${code}*\n\n`;
  courierMsg += `📦 *Itens:*\n${itemsText}\n\n`;
  courierMsg += `📍 *Endereço:*\n${order.street}, ${order.number}`;
  if (order.complement) courierMsg += ` - ${order.complement}`;
  courierMsg += `\n${order.neighborhood}, ${order.city}/${order.state}\nCEP: ${order.cep}\n\n`;
  courierMsg += `👤 *Cliente:* ${order.customer.name}\n📱 ${order.customer.phone}\n\n`;
  courierMsg += `💳 *Pagamento:* ${order.paymentMethod}`;
  if (order.paymentMethod === "CASH" && order.changeFor) {
    courierMsg += ` (Troco: R$ ${order.changeFor.toFixed(2).replace(".", ",")})`;
  }
  courierMsg += `\n💰 *Total:* R$ ${order.totalAmount.toFixed(2).replace(".", ",")}`;

  sendWhatsApp(storeId, courier.phone, courierMsg);

  const customerMsg = `📋 *Pedido #${code} — ${order.store.name}*\n\n🏍️ Seu pedido *saiu para entrega* com *${courier.name}*! Fique de olho!`;
  sendWhatsApp(storeId, order.customer.phone, customerMsg);

  revalidatePath("/dashboard");
}

export async function cancelOrder(orderId: string, reason: string) {
  const session = await auth();
  const storeId = (session?.user as any)?.storeId;
  if (!storeId) throw new Error("Não autorizado");

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { customer: true, store: { select: { name: true } } },
  });
  if (order?.storeId !== storeId) throw new Error("Não autorizado");

  if (order.uberDeliveryId && order.status !== "DELIVERED" && order.status !== "CANCELED") {
    try {
      await cancelDelivery(order.uberDeliveryId);
    } catch (err) {
      console.error("Failed to cancel Uber Direct delivery:", err);
    }
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { status: "CANCELED", cancelReason: reason },
  });

  if (order.customer.phone) {
    const code = order.id.slice(-6).toUpperCase();
    const msg = `📋 *Pedido #${code} — ${order.store.name}*\n\n❌ Seu pedido foi *cancelado*.\nMotivo: ${reason}`;
    sendWhatsApp(storeId, order.customer.phone, msg);
  }

  revalidatePath("/dashboard");
}

// =============================================================================
// UBER DIRECT
// =============================================================================

export async function getUberQuote(orderId: string): Promise<{ fee: number; estimatedMinutes: number; quoteId: string }> {
  const session = await auth();
  const storeId = (session?.user as any)?.storeId;
  if (!storeId) throw new Error("Não autorizado");

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.storeId !== storeId) throw new Error("Pedido não encontrado");

  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) throw new Error("Loja não encontrada");

  if (!store.storeStreet || !store.storeCity || !store.storeCep) {
    throw new Error("Configure o endereço da loja nas Configurações antes de usar o Uber Direct.");
  }

  const quote = await createQuote(
    {
      street: store.storeStreet,
      number: store.storeNumber || "S/N",
      city: store.storeCity,
      state: store.storeState || "BA",
      cep: store.storeCep,
      latitude: store.storeLatitude || undefined,
      longitude: store.storeLongitude || undefined,
    },
    {
      street: order.street,
      number: order.number,
      city: order.city,
      state: order.state,
      cep: order.cep,
    }
  );

  const feeReais = quote.fee / 100;

  return {
    fee: feeReais,
    estimatedMinutes: quote.estimatedMinutes,
    quoteId: quote.id,
  };
}

export async function dispatchViaUberDirect(orderId: string, quoteId: string) {
  const session = await auth();
  const storeId = (session?.user as any)?.storeId;
  if (!storeId) throw new Error("Não autorizado");

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: true,
      store: true,
      items: { include: { product: { select: { name: true } } } },
    },
  });
  if (!order || order.storeId !== storeId) throw new Error("Pedido não encontrado");

  const store = order.store;
  if (!store.storeStreet || !store.storeCity || !store.storeCep) {
    throw new Error("Configure o endereço da loja nas Configurações.");
  }

  const delivery = await createDelivery({
    quoteId,
    pickupName: store.name,
    pickupPhone: store.phone || "",
    pickupStreet: store.storeStreet,
    pickupNumber: store.storeNumber || "S/N",
    pickupCity: store.storeCity,
    pickupState: store.storeState || "BA",
    pickupCep: store.storeCep,
    pickupLatitude: store.storeLatitude || undefined,
    pickupLongitude: store.storeLongitude || undefined,
    dropoffName: order.customer.name,
    dropoffPhone: order.customer.phone,
    dropoffStreet: order.street,
    dropoffNumber: order.number,
    dropoffComplement: order.complement || undefined,
    dropoffNeighborhood: order.neighborhood,
    dropoffCity: order.city,
    dropoffState: order.state,
    dropoffCep: order.cep,
    dropoffNotes: order.observation || undefined,
    items: order.items.map(i => ({
      name: i.product.name,
      quantity: i.quantity,
      price: i.price,
    })),
  });

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "DISPATCHED",
      uberDeliveryId: delivery.id,
      uberTrackingUrl: delivery.trackingUrl,
      uberDeliveryFee: delivery.fee / 100,
    },
  });

  const code = order.id.slice(-6).toUpperCase();
  let msg = `📋 *Pedido #${code} — ${store.name}*\n\n🚗 Seu pedido *saiu para entrega* via *Uber*!`;
  if (delivery.trackingUrl) {
    msg += `\n\n📍 Rastreie em tempo real:\n${delivery.trackingUrl}`;
  }
  sendWhatsApp(storeId, order.customer.phone, msg);

  revalidatePath("/dashboard");

  return { trackingUrl: delivery.trackingUrl };
}
