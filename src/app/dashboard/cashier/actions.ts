"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Abre o caixa da loja
 */
export async function openCashier(initialValue: number) {
  const session = await auth();
  if (!session?.user?.storeId) throw new Error("Não autorizado");

  // Verificar se já existe um caixa aberto
  const activeCashier = await prisma.cashRegister.findFirst({
    where: {
      storeId: session.user.storeId,
      status: "OPEN"
    }
  });

  if (activeCashier) throw new Error("Já existe um caixa aberto.");

  await prisma.cashRegister.create({
    data: {
      storeId: session.user.storeId,
      initialValue,
      status: "OPEN"
    }
  });

  revalidatePath("/dashboard/cashier");
  revalidatePath("/dashboard");
}

/**
 * Fecha o caixa da loja e calcula o valor final
 */
export async function closeCashier(cashRegisterId: string) {
  const session = await auth();
  if (!session?.user?.storeId) throw new Error("Não autorizado");

  // Buscar pedidos vinculados a este caixa para calcular faturamento
  const orders = await prisma.order.findMany({
    where: {
      cashRegisterId,
      status: "DELIVERED"
    },
    select: {
      totalAmount: true
    }
  });

  const totalSales = orders.reduce((sum, order) => sum + order.totalAmount, 0);

  // Buscar o caixa para pegar o valor inicial
  const cashier = await prisma.cashRegister.findUnique({
    where: { id: cashRegisterId }
  });

  const finalValue = (cashier?.initialValue || 0) + totalSales;

  await prisma.cashRegister.update({
    where: { id: cashRegisterId },
    data: {
      closedAt: new Date(),
      status: "CLOSED",
      finalValue
    }
  });

  revalidatePath("/dashboard/cashier");
  revalidatePath("/dashboard");
}
