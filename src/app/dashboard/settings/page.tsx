import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const session = await auth();
  const storeId = (session?.user as any)?.storeId;

  if (!storeId) {
    redirect("/login");
  }

  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: {
      name: true,
      phone: true,
      description: true,
      currency: true,
      openStatus: true,
      welcomeMessage: true,
      uberDirectEnabled: true,
      storeStreet: true,
      storeNumber: true,
      storeNeighborhood: true,
      storeCity: true,
      storeState: true,
      storeCep: true,
    },
  });

  if (!store) {
    return <div>Loja não encontrada.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <SettingsClient store={store} />
    </div>
  );
}
