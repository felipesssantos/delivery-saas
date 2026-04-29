import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  const storeId = (session?.user as any)?.storeId;

  if (!storeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { openStatus: true },
  });

  return NextResponse.json({ openStatus: store?.openStatus ?? false });
}
