import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET /api/store/by-id?storeId=XXX
// Used by the WhatsApp chatbot to get store info
export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get("storeId");

  if (!storeId) {
    return NextResponse.json({ error: "storeId é obrigatório" }, { status: 400 });
  }

  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: {
      id: true,
      slug: true,
      name: true,
      openStatus: true,
      baseDeliveryFee: true,
      welcomeMessage: true,
      phone: true,
    },
  });

  if (!store) {
    return NextResponse.json({ error: "Loja não encontrada" }, { status: 404 });
  }

  return NextResponse.json(store);
}
