import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  const storeId = (session?.user as any)?.storeId;

  if (!storeId) return NextResponse.json({ active: false });

  const activeCashier = await prisma.cashRegister.findFirst({
    where: { storeId, status: "OPEN" },
    select: { id: true, initialValue: true, openedAt: true }
  });

  return NextResponse.json({
    active: !!activeCashier,
    cashier: activeCashier
  });
}
