import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import CashierClient from "./CashierClient";

export default async function CashierPage() {
  const session = await auth();
  if (!session?.user?.storeId) {
    redirect("/auth");
  }

  const activeCashier = await prisma.cashRegister.findFirst({
    where: {
      storeId: session.user.storeId,
      status: "OPEN"
    }
  });

  const history = await prisma.cashRegister.findMany({
    where: {
      storeId: session.user.storeId
    },
    orderBy: {
      openedAt: "desc"
    },
    take: 10
  });

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Fluxo de Caixa</h1>
        <p className="text-[var(--text-secondary)] mt-2">
          Gerencie a abertura e fechamento do seu caixa diário para controle financeiro.
        </p>
      </div>

      <CashierClient 
        activeCashier={activeCashier ? {
          id: activeCashier.id,
          status: activeCashier.status,
          openedAt: activeCashier.openedAt,
          initialValue: activeCashier.initialValue
        } : null}
        history={history}
      />
    </div>
  );
}
