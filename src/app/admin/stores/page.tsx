import { ensureAdmin } from "@/lib/admin";
import prisma from "@/lib/prisma";

export default async function AdminStoresPage() {
  await ensureAdmin();

  const stores = await prisma.store.findMany({
    include: {
      _count: {
        select: { orders: true, products: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Gerenciamento de Lojas (SaaS)</h1>
        <p className="text-[var(--text-secondary)] mt-2"> Visualize e gerencie todos os seus clientes.</p>
      </div>

      <div className="card" style={{ backgroundColor: "var(--surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ backgroundColor: "var(--background)" }}>
            <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
              <th style={{ padding: "1rem" }}>Loja</th>
              <th style={{ padding: "1rem" }}>Slug</th>
              <th style={{ padding: "1rem" }}>Produtos</th>
              <th style={{ padding: "1rem" }}>Pedidos</th>
              <th style={{ padding: "1rem" }}>Status</th>
              <th style={{ padding: "1rem" }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {stores.map(store => (
              <tr key={store.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "1rem", fontWeight: 600 }}>{store.name}</td>
                <td style={{ padding: "1rem" }}>{store.slug}</td>
                <td style={{ padding: "1rem" }}>{store._count.products}</td>
                <td style={{ padding: "1rem" }}>{store._count.orders}</td>
                <td style={{ padding: "1rem" }}>
                  <span style={{ 
                    padding: "0.2rem 0.5rem", 
                    borderRadius: "2rem", 
                    fontSize: "0.75rem",
                    backgroundColor: store.isActive ? "var(--success-light)" : "var(--error-light)",
                    color: store.isActive ? "var(--success)" : "var(--error)"
                  }}>
                    {store.isActive ? "Ativa" : "Inativa"}
                  </span>
                </td>
                <td style={{ padding: "1rem" }}>
                  <button className="btn-secondary" style={{ fontSize: "0.75rem", padding: "0.25rem 0.75rem" }}>
                    Configurar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
