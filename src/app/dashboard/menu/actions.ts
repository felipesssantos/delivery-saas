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
// CATEGORIES
// -----------------------------------------------------------------------------

export async function createCategory(formData: FormData) {
  const storeId = await getStoreId();
  const name = formData.get("name") as string;
  const isActive = formData.get("isActive") === "true";

  if (!name) throw new Error("O nome da categoria é obrigatório.");

  const categoryCount = await prisma.category.count({ where: { storeId } });

  await prisma.category.create({
    data: {
      storeId,
      name,
      isActive,
      order: categoryCount, // Add to the end
    },
  });

  revalidatePath("/dashboard/menu");
}

export async function updateCategory(id: string, formData: FormData) {
  const storeId = await getStoreId();
  const name = formData.get("name") as string;
  const isActive = formData.get("isActive") === "true";

  if (!name) throw new Error("O nome da categoria é obrigatório.");

  await prisma.category.update({
    where: { id, storeId },
    data: { name, isActive },
  });

  revalidatePath("/dashboard/menu");
}

export async function deleteCategory(id: string) {
  const storeId = await getStoreId();

  await prisma.category.delete({
    where: { id, storeId },
  });

  revalidatePath("/dashboard/menu");
}

// -----------------------------------------------------------------------------
// PRODUCTS
// -----------------------------------------------------------------------------

export async function createProduct(formData: FormData) {
  const storeId = await getStoreId();
  const categoryId = formData.get("categoryId") as string;
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const price = parseFloat(formData.get("price") as string);
  const image = formData.get("image") as string;
  const isActive = formData.get("isActive") === "true";

  if (!categoryId || !name || isNaN(price)) {
    throw new Error("Preencha os campos obrigatórios corretamente.");
  }

  const productCount = await prisma.product.count({ where: { categoryId } });

  await prisma.product.create({
    data: {
      storeId,
      categoryId,
      name,
      description: description || null,
      price,
      image: image || null,
      isActive,
      order: productCount,
    },
  });

  revalidatePath("/dashboard/menu");
}

export async function updateProduct(id: string, formData: FormData) {
  const storeId = await getStoreId();
  const categoryId = formData.get("categoryId") as string;
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const price = parseFloat(formData.get("price") as string);
  const image = formData.get("image") as string;
  const isActive = formData.get("isActive") === "true";

  if (!categoryId || !name || isNaN(price)) {
    throw new Error("Preencha os campos obrigatórios corretamente.");
  }

  await prisma.product.update({
    where: { id, storeId },
    data: {
      categoryId,
      name,
      description: description || null,
      price,
      image: image || null,
      isActive,
    },
  });

  revalidatePath("/dashboard/menu");
}

export async function deleteProduct(id: string) {
  const storeId = await getStoreId();

  await prisma.product.delete({
    where: { id, storeId },
  });

  revalidatePath("/dashboard/menu");
}
