import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get("storeId");
  const phone = searchParams.get("phone");

  if (!storeId || !phone) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const customer = await prisma.customer.findUnique({
    where: {
      storeId_phone: {
        storeId,
        phone,
      },
    },
    select: {
      name: true,
    },
  });

  return NextResponse.json(customer);
}
