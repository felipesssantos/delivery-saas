import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET /api/orders/by-phone?phone=XXX&storeId=YYY
export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get("phone");
  const storeId = req.nextUrl.searchParams.get("storeId");

  if (!phone || !storeId) {
    return NextResponse.json({ error: "phone e storeId são obrigatórios" }, { status: 400 });
  }

  const cleanPhone = phone.replace(/\D/g, "");

  const customer = await prisma.customer.findFirst({
    where: { storeId, phone: cleanPhone },
  });

  if (!customer) {
    return NextResponse.json({ orders: [] });
  }

  const orders = await prisma.order.findMany({
    where: { storeId, customerId: customer.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      items: { include: { product: { select: { name: true } } } },
    },
  });

  return NextResponse.json({ orders });
}
