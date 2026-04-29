import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import DeliveryClient from "./DeliveryClient";

export default async function DeliveryPage() {
  const session = await auth();
  if (!session?.user?.storeId) {
    redirect("/auth");
  }

  const store = await prisma.store.findUnique({
    where: { id: session.user.storeId },
    select: { baseDeliveryFee: true }
  });

  const cities = await prisma.deliveryCity.findMany({
    where: { storeId: session.user.storeId },
    orderBy: { createdAt: "asc" },
    include: {
      blacklistedNeighborhoods: {
        orderBy: { createdAt: "desc" }
      }
    }
  });

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Entregas e Taxas</h1>
        <p className="text-[var(--text-secondary)] mt-2">
          Configure sua taxa de entrega, cidades atendidas e bairros bloqueados.
        </p>
      </div>

      <DeliveryClient 
        initialBaseFee={store?.baseDeliveryFee || 0}
        cities={cities}
      />
    </div>
  );
}
