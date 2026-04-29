import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import CouriersClient from "./CouriersClient";

export default async function CouriersPage() {
  const session = await auth();
  const storeId = (session?.user as any)?.storeId;

  if (!storeId) {
    redirect("/login");
  }

  const couriers = await prisma.courier.findMany({
    where: { storeId },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)" }}>Entregadores</h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "0.5rem" }}>
          Cadastre os entregadores da sua loja. Eles receberão os detalhes do pedido por WhatsApp.
        </p>
      </div>
      <CouriersClient couriers={couriers} />
    </div>
  );
}
