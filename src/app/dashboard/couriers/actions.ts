"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function createCourier(name: string, phone: string, plate: string) {
  const session = await auth();
  const storeId = (session?.user as any)?.storeId;
  if (!storeId) throw new Error("Não autorizado");

  await prisma.courier.create({
    data: { storeId, name: name.trim(), phone: phone.replace(/\D/g, ""), plate: plate.trim().toUpperCase() || null },
  });

  revalidatePath("/dashboard/couriers");
}

export async function updateCourier(id: string, name: string, phone: string, plate: string, isActive: boolean) {
  const session = await auth();
  const storeId = (session?.user as any)?.storeId;
  if (!storeId) throw new Error("Não autorizado");

  const courier = await prisma.courier.findUnique({ where: { id } });
  if (courier?.storeId !== storeId) throw new Error("Não autorizado");

  await prisma.courier.update({
    where: { id },
    data: { name: name.trim(), phone: phone.replace(/\D/g, ""), plate: plate.trim().toUpperCase() || null, isActive },
  });

  revalidatePath("/dashboard/couriers");
}

export async function deleteCourier(id: string) {
  const session = await auth();
  const storeId = (session?.user as any)?.storeId;
  if (!storeId) throw new Error("Não autorizado");

  const courier = await prisma.courier.findUnique({ where: { id } });
  if (courier?.storeId !== storeId) throw new Error("Não autorizado");

  await prisma.courier.delete({ where: { id } });

  revalidatePath("/dashboard/couriers");
}
