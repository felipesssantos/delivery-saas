"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

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

  // Notify customer via WhatsApp
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

  // Update order: assign courier + set status to DISPATCHED
  await prisma.order.update({
    where: { id: orderId },
    data: { courierId, status: "DISPATCHED" },
  });

  // Build message for courier
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

  // Also notify the customer
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

  await prisma.order.update({
    where: { id: orderId },
    data: { status: "CANCELED", cancelReason: reason },
  });

  // Notify customer
  if (order.customer.phone) {
    const code = order.id.slice(-6).toUpperCase();
    const msg = `📋 *Pedido #${code} — ${order.store.name}*\n\n❌ Seu pedido foi *cancelado*.\nMotivo: ${reason}`;
    sendWhatsApp(storeId, order.customer.phone, msg);
  }

  revalidatePath("/dashboard");
}
