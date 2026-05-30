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
  const acceptsPickupToggle = formData.get("acceptsPickupToggle") as string | null;

  const updateData: any = {};
  if (name !== null) updateData.name = name;
  if (phone !== null) updateData.phone = phone;
  if (description !== null) updateData.description = description;
  if (currency !== null) updateData.currency = currency;
  if (welcomeMessage !== null) updateData.welcomeMessage = welcomeMessage || null;
  if (acceptsPickupToggle !== null) updateData.acceptsPickup = acceptsPickupToggle === "true";

  await prisma.store.update({
    where: { id: storeId },
    data: updateData,
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
    where: { id, storeId },
  });

  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function updateUberDirect(enabled: boolean) {
  const session = await auth();
  const storeId = (session?.user as any)?.storeId;
  if (!storeId) throw new Error("Não autorizado");

  await prisma.store.update({
    where: { id: storeId },
    data: { uberDirectEnabled: enabled },
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateStoreAddress(formData: FormData) {
  const session = await auth();
  const storeId = (session?.user as any)?.storeId;
  if (!storeId) throw new Error("Não autorizado");

  const latStr = formData.get("storeLatitude") as string;
  const lonStr = formData.get("storeLongitude") as string;

  await prisma.store.update({
    where: { id: storeId },
    data: {
      storeStreet: formData.get("storeStreet") as string,
      storeNumber: formData.get("storeNumber") as string,
      storeNeighborhood: formData.get("storeNeighborhood") as string || null,
      storeCity: formData.get("storeCity") as string,
      storeState: formData.get("storeState") as string,
      storeCep: formData.get("storeCep") as string,
      storeLatitude: latStr ? parseFloat(latStr) : null,
      storeLongitude: lonStr ? parseFloat(lonStr) : null,
    },
  });

  revalidatePath("/dashboard/settings");
  return { success: true };
}
