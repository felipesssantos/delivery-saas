"use server";

import prisma from "@/lib/prisma";

type OrderInput = {
  storeId: string;
  customerName: string;
  customerPhone: string;
  deliveryMethod?: "DELIVERY" | "PICKUP";
  cep?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  paymentMethod: string;
  changeFor: string | null;
  observation: string;
  deliveryFee: number;
  items: { 
    productId: string; 
    name: string; 
    quantity: number; 
    price: number;
    addons: { id: string; name: string; price: number }[];
  }[];
  subtotal: number;
};

export async function createOrder(input: OrderInput) {
  // 0. Double check if store allows pickup before proceeding
  if (input.deliveryMethod === "PICKUP") {
    const storeCheck = await prisma.store.findUnique({
      where: { id: input.storeId },
      select: { acceptsPickup: true }
    });
    
    if (!storeCheck?.acceptsPickup) {
      throw new Error("Esta loja não está mais aceitando retiradas no local no momento. Por favor, atualize a página.");
    }
  }

  // 1. Upsert the customer (find or create by phone + storeId)
  const cleanPhone = input.customerPhone.replace(/\D/g, "");
  
  const customer = await prisma.customer.upsert({
    where: {
      storeId_phone: {
        storeId: input.storeId,
        phone: cleanPhone,
      },
    },
    update: { name: input.customerName },
    create: {
      storeId: input.storeId,
      name: input.customerName,
      phone: cleanPhone,
    },
  });

  // 2. Calculate total
  const totalAmount = input.subtotal + input.deliveryFee;

  // 3. Find active cashier for this store
  const activeCashier = await prisma.cashRegister.findFirst({
    where: {
      storeId: input.storeId,
      status: "OPEN"
    },
    select: { id: true }
  });

  const isPickup = input.deliveryMethod === "PICKUP";

  // 4. Create the order with items
  const order = await prisma.order.create({
    data: {
      storeId: input.storeId,
      customerId: customer.id,
      cashRegisterId: activeCashier?.id || null,
      totalAmount,
      deliveryFee: input.deliveryFee,
      deliveryMethod: input.deliveryMethod || "DELIVERY",
      cep: isPickup ? null : input.cep,
      street: isPickup ? null : input.street,
      number: isPickup ? null : input.number,
      neighborhood: isPickup ? null : input.neighborhood,
      complement: isPickup ? null : input.complement,
      city: isPickup ? null : input.city,
      state: isPickup ? null : input.state,
      paymentMethod: input.paymentMethod,
      changeFor: input.paymentMethod === "CASH" && input.changeFor 
        ? parseFloat(input.changeFor.replace(",", ".")) 
        : null,
      observation: input.observation || null,
      items: {
        create: input.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          addons: {
            create: item.addons.map(addon => ({
              addonOptionId: addon.id,
              price: addon.price
            }))
          }
        })),
      },
    },
    include: {
      items: {
        include: { 
          product: true,
          addons: {
            include: { addonOption: true }
          }
        }
      }
    }
  });

  // 4. Send WhatsApp notification to the store
  try {
    const store = await prisma.store.findUnique({
      where: { id: input.storeId },
      select: { phone: true }
    });

    // Build order message
    const itemsText = order.items.map(i => {
      let text = `  • ${i.quantity}x ${i.product.name} — R$ ${(i.price * i.quantity).toFixed(2).replace(".", ",")}`;
      if (i.addons && i.addons.length > 0) {
        const addonNames = i.addons.map(a => a.addonOption.name).join(", ");
        text += `\n    └ ${addonNames}`;
      }
      return text;
    }).join("\n");

    const paymentLabels: Record<string, string> = {
      PIX: "PIX",
      CARD: "Cartão (Máquininha)",
      CASH: "Dinheiro"
    };

    let message = `🛒 *NOVO PEDIDO #${order.id.slice(-6).toUpperCase()}*\n\n`;
    message += `👤 *Cliente:* ${input.customerName}\n`;
    message += `📱 *WhatsApp:* ${input.customerPhone}\n\n`;
    message += `📦 *Itens:*\n${itemsText}\n\n`;
    message += `💰 Subtotal: R$ ${input.subtotal.toFixed(2).replace(".", ",")}\n`;
    message += `🚚 Entrega: ${isPickup ? "Retirada (Grátis)" : "R$ " + input.deliveryFee.toFixed(2).replace(".", ",")}\n`;
    message += `✅ *TOTAL: R$ ${totalAmount.toFixed(2).replace(".", ",")}*\n\n`;
    
    if (isPickup) {
      message += `📍 *Retirada na Loja*\n\n`;
    } else {
      message += `📍 *Endereço:*\n${input.street}, ${input.number}`;
      if (input.complement) message += ` - ${input.complement}`;
      message += `\n${input.neighborhood}, ${input.city}/${input.state}\nCEP: ${input.cep}\n\n`;
    }

    message += `💳 *Pagamento:* ${paymentLabels[input.paymentMethod] || input.paymentMethod}`;
    if (input.paymentMethod === "CASH" && input.changeFor) {
      message += ` (Troco para R$ ${input.changeFor})`;
    }
    if (input.observation) {
      message += `\n\n📝 *Obs:* ${input.observation}`;
    }

    // Call the WhatsApp service
    await fetch(`${process.env.WHATSAPP_SERVICE_URL || "http://localhost:3001"}/api/send-message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeId: input.storeId,
        toPhone: store?.phone || "",
        message,
        secret: process.env.API_SECRET,
      }),
    });
  } catch (err) {
    console.error("Erro ao enviar WhatsApp:", err);
    // Don't throw — the order was saved successfully even if WhatsApp fails
  }

  return { orderId: order.id };
}
