import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import KanbanClient from "./KanbanClient";

export default async function DashboardPage() {
  const session = await auth();
  const storeId = (session?.user as any)?.storeId;

  if (!storeId) {
    redirect("/login");
  }

  const orders = await prisma.order.findMany({
    where: { storeId },
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { name: true, phone: true } },
      courier: { select: { name: true } },
      items: { include: { product: { select: { name: true } } } },
    },
  });

  const couriers = await prisma.courier.findMany({
    where: { storeId, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return <KanbanClient orders={orders} couriers={couriers} />;
}
