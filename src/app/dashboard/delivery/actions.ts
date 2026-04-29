"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

// ── Taxa de Entrega ──

export async function updateBaseDeliveryFee(fee: number) {
  const session = await auth();
  if (!session?.user?.storeId) throw new Error("Não autorizado");

  await prisma.store.update({
    where: { id: session.user.storeId },
    data: { baseDeliveryFee: fee }
  });

  revalidatePath("/dashboard/delivery");
}

// ── Cidades Atendidas ──

export async function addDeliveryCity(name: string) {
  const session = await auth();
  if (!session?.user?.storeId) throw new Error("Não autorizado");

  await prisma.deliveryCity.create({
    data: {
      storeId: session.user.storeId,
      name: name.trim(),
    }
  });

  revalidatePath("/dashboard/delivery");
}

export async function removeDeliveryCity(id: string) {
  const session = await auth();
  if (!session?.user?.storeId) throw new Error("Não autorizado");

  const city = await prisma.deliveryCity.findUnique({ where: { id } });
  if (city?.storeId !== session.user.storeId) throw new Error("Não autorizado");

  // Cascade will delete linked blacklisted neighborhoods
  await prisma.deliveryCity.delete({ where: { id } });

  revalidatePath("/dashboard/delivery");
}

// ── Bairros Bloqueados (Blacklist) ──

export async function addBlacklistNeighborhood(deliveryCityId: string, name: string) {
  const session = await auth();
  if (!session?.user?.storeId) throw new Error("Não autorizado");

  // Verify city ownership
  const city = await prisma.deliveryCity.findUnique({ where: { id: deliveryCityId } });
  if (city?.storeId !== session.user.storeId) throw new Error("Não autorizado");

  await prisma.deliveryArea.create({
    data: {
      storeId: session.user.storeId,
      deliveryCityId,
      name: name.trim(),
    }
  });

  revalidatePath("/dashboard/delivery");
}

export async function removeBlacklistNeighborhood(id: string) {
  const session = await auth();
  if (!session?.user?.storeId) throw new Error("Não autorizado");

  const area = await prisma.deliveryArea.findUnique({ where: { id } });
  if (area?.storeId !== session.user.storeId) throw new Error("Não autorizado");

  await prisma.deliveryArea.delete({ where: { id } });

  revalidatePath("/dashboard/delivery");
}
