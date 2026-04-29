"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateStoreSettings(formData: FormData) {
  const session = await auth();
  const storeId = (session?.user as any)?.storeId;

  if (!storeId) {
    throw new Error("Não autorizado");
  }

  const name = formData.get("name") as string;
  const phone = formData.get("phone") as string;
  const description = formData.get("description") as string;
  const currency = formData.get("currency") as string;
  const welcomeMessage = formData.get("welcomeMessage") as string;

  await prisma.store.update({
    where: { id: storeId },
    data: {
      name,
      phone,
      description,
      currency,
      welcomeMessage: welcomeMessage || null,
    },
  });

  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function toggleStoreStatus(isOpen: boolean) {
  const session = await auth();
  const storeId = (session?.user as any)?.storeId;

  if (!storeId) throw new Error("Não autorizado");

  await prisma.store.update({
    where: { id: storeId },
    data: { openStatus: isOpen },
  });

  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function addDeliveryArea(formData: FormData) {
  const session = await auth();
  const storeId = (session?.user as any)?.storeId;
  if (!storeId) throw new Error("Não autorizado");

  const name = formData.get("name") as string;
  const isBlacklist = formData.get("isBlacklist") === "true";
  
  let fee = 0;
  if (!isBlacklist) {
    const feeStr = formData.get("fee") as string;
    fee = parseFloat(feeStr.replace(',', '.'));
    if (isNaN(fee)) throw new Error("Taxa inválida");
  }

  if (!name) throw new Error("Dados inválidos");

  await prisma.deliveryArea.create({
    data: {
      storeId,
      name,
      fee,
      isBlacklist,
    },
  });

  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function deleteDeliveryArea(id: string) {
  const session = await auth();
  const storeId = (session?.user as any)?.storeId;
  if (!storeId) throw new Error("Não autorizado");

  await prisma.deliveryArea.delete({
    where: { id, storeId }, // Garantir que pertence à loja
  });

  revalidatePath("/dashboard/settings");
  return { success: true };
}
