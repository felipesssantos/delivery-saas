import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import MenuClient from "./MenuClient";

export default async function MenuPage() {
  const session = await auth();
  const storeId = (session?.user as any)?.storeId;

  if (!storeId) {
    redirect("/login");
  }

  // Fetch all categories with their products, ordered
  const categories = await prisma.category.findMany({
    where: { storeId },
    orderBy: { order: "asc" },
    include: {
      products: {
        orderBy: { order: "asc" },
      },
    },
  });

  return (
    <div style={{ padding: "2rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Cardápio</h2>
        <p style={{ color: "var(--text-secondary)" }}>Gerencie suas categorias e produtos.</p>
      </div>

      <MenuClient initialCategories={categories} />
    </div>
  );
}
