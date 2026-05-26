import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import CustomersClient from "./CustomersClient";

export default async function CustomersPage() {
  const session = await auth();
  const storeId = (session?.user as any)?.storeId;

  if (!storeId) redirect("/login");

  // Fetch customers with their orders (to get last order details and count)
  const customers = await prisma.customer.findMany({
    where: { storeId },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
      }
    },
    orderBy: { updatedAt: "desc" }
  });

  const formattedCustomers = customers.map(c => {
    const lastOrder = c.orders[0];
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      totalOrders: c.orders.length,
      lastOrderDate: lastOrder ? lastOrder.createdAt.toISOString() : null,
      lastAddress: lastOrder 
        ? `${lastOrder.street}, ${lastOrder.number}${lastOrder.complement ? ` - ${lastOrder.complement}` : ''}, ${lastOrder.neighborhood}`
        : "Sem endereço registrado",
    };
  });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Clientes</h1>
        <p className="text-[var(--text-secondary)] mt-2">
          Visualize a lista completa de clientes e seus históricos de compra.
        </p>
      </div>

      <CustomersClient initialCustomers={formattedCustomers} />
    </div>
  );
}
