"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function getStoreId() {
  const session = await auth();
  const storeId = (session?.user as any)?.storeId;
  if (!storeId) throw new Error("Não autorizado");
  return storeId;
}

// -----------------------------------------------------------------------------
// ADDON CATEGORIES (Globais por Loja)
// -----------------------------------------------------------------------------

export async function createAddonCategory(formData: FormData) {
  const storeId = await getStoreId();

  const name = formData.get("name") as string;
  const minSelect = parseInt(formData.get("minSelect") as string, 10) || 0;
  const maxSelect = parseInt(formData.get("maxSelect") as string, 10) || 1;
  const isRequired = formData.get("isRequired") === "true";
  const pricingMethod = formData.get("pricingMethod") as "SUM" | "AVERAGE" | "HIGHEST";

  if (!name) throw new Error("O nome do grupo é obrigatório.");

  await prisma.addonCategory.create({
    data: {
      storeId,
      name,
      minSelect,
      maxSelect,
      isRequired,
      pricingMethod,
    },
  });

  revalidatePath("/dashboard/complements");
  revalidatePath("/dashboard/menu");
}

export async function updateAddonCategory(id: string, formData: FormData) {
  const storeId = await getStoreId();

  const category = await prisma.addonCategory.findUnique({ where: { id } });
  if (!category || category.storeId !== storeId) throw new Error("Grupo não encontrado.");

  const name = formData.get("name") as string;
  const minSelect = parseInt(formData.get("minSelect") as string, 10) || 0;
  const maxSelect = parseInt(formData.get("maxSelect") as string, 10) || 1;
  const isRequired = formData.get("isRequired") === "true";
  const pricingMethod = formData.get("pricingMethod") as "SUM" | "AVERAGE" | "HIGHEST";

  if (!name) throw new Error("O nome do grupo é obrigatório.");

  await prisma.addonCategory.update({
    where: { id },
    data: { name, minSelect, maxSelect, isRequired, pricingMethod },
  });

  revalidatePath("/dashboard/complements");
  revalidatePath("/dashboard/menu");
}

export async function deleteAddonCategory(id: string) {
  const storeId = await getStoreId();

  const category = await prisma.addonCategory.findUnique({ where: { id } });
  if (!category || category.storeId !== storeId) throw new Error("Grupo não encontrado.");

  await prisma.addonCategory.delete({ where: { id } });

  revalidatePath("/dashboard/complements");
  revalidatePath("/dashboard/menu");
}

// -----------------------------------------------------------------------------
// ADDON OPTIONS
// -----------------------------------------------------------------------------

export async function createAddonOption(addonCategoryId: string, formData: FormData) {
  const storeId = await getStoreId();

  const category = await prisma.addonCategory.findUnique({ where: { id: addonCategoryId } });
  if (!category || category.storeId !== storeId) throw new Error("Grupo não encontrado.");

  const name = formData.get("name") as string;
  const priceRaw = formData.get("price") as string;
  const price = priceRaw ? parseFloat(priceRaw) : 0;

  if (!name) throw new Error("O nome da opção é obrigatório.");

  await prisma.addonOption.create({
    data: { addonCategoryId, name, price },
  });

  revalidatePath("/dashboard/complements");
  revalidatePath("/dashboard/menu");
}

export async function updateAddonOption(id: string, formData: FormData) {
  const storeId = await getStoreId();

  const option = await prisma.addonOption.findUnique({
    where: { id },
    include: { addonCategory: true }
  });
  if (!option || option.addonCategory.storeId !== storeId) throw new Error("Opção não encontrada.");

  const name = formData.get("name") as string;
  const priceRaw = formData.get("price") as string;
  const price = priceRaw ? parseFloat(priceRaw) : 0;

  if (!name) throw new Error("O nome da opção é obrigatório.");

  await prisma.addonOption.update({
    where: { id },
    data: { name, price },
  });

  revalidatePath("/dashboard/complements");
  revalidatePath("/dashboard/menu");
}

export async function deleteAddonOption(id: string) {
  const storeId = await getStoreId();

  const option = await prisma.addonOption.findUnique({
    where: { id },
    include: { addonCategory: true }
  });
  if (!option || option.addonCategory.storeId !== storeId) throw new Error("Opção não encontrada.");

  await prisma.addonOption.delete({ where: { id } });

  revalidatePath("/dashboard/complements");
  revalidatePath("/dashboard/menu");
}

// -----------------------------------------------------------------------------
// VINCULAR / DESVINCULAR GRUPO A UM PRODUTO
// -----------------------------------------------------------------------------

export async function linkAddonToProduct(productId: string, addonCategoryId: string) {
  const storeId = await getStoreId();

  const product = await prisma.product.findUnique({ where: { id: productId, storeId } });
  if (!product) throw new Error("Produto não encontrado.");

  const category = await prisma.addonCategory.findUnique({ where: { id: addonCategoryId } });
  if (!category || category.storeId !== storeId) throw new Error("Grupo não encontrado.");

  await prisma.productAddonCategory.create({
    data: { productId, addonCategoryId },
  });

  revalidatePath("/dashboard/menu");
}

export async function unlinkAddonFromProduct(productId: string, addonCategoryId: string) {
  const storeId = await getStoreId();

  const product = await prisma.product.findUnique({ where: { id: productId, storeId } });
  if (!product) throw new Error("Produto não encontrado.");

  await prisma.productAddonCategory.deleteMany({
    where: { productId, addonCategoryId },
  });

  revalidatePath("/dashboard/menu");
}
