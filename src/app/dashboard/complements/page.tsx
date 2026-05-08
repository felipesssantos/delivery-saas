import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import ComplementsClient from "./ComplementsClient";

export default async function ComplementsPage() {
  const session = await auth();
  const storeId = (session?.user as any)?.storeId;

  if (!storeId) {
    redirect("/login");
  }

  const addonCategories = await prisma.addonCategory.findMany({
    where: { storeId },
    include: {
      options: { orderBy: { name: "asc" } },
      productLinks: { include: { product: { select: { name: true } } } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div style={{ padding: "2rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Complementos</h2>
        <p style={{ color: "var(--text-secondary)" }}>Gerencie seus grupos de sabores e adicionais. Os grupos criados aqui ficam disponíveis para serem vinculados a qualquer produto.</p>
      </div>
      <ComplementsClient initialCategories={addonCategories} />
    </div>
  );
}
