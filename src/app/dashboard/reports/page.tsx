import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function ReportsPage() {
  const session = await auth();
  const storeId = (session?.user as any)?.storeId;

  if (!storeId) redirect("/login");

  // 1. Faturamento Total (Entregues)
  const deliveredOrders = await prisma.order.findMany({
    where: { storeId, status: "DELIVERED" },
    select: { totalAmount: true }
  });

  const totalRevenue = deliveredOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalCount = deliveredOrders.length;
  const averageTicket = totalCount > 0 ? totalRevenue / totalCount : 0;

  // 2. Top Produtos (Mais vendidos em quantidade)
  const orderItems = await prisma.orderItem.findMany({
    where: { order: { storeId, status: "DELIVERED" } },
    include: { product: { select: { name: true } } }
  });

  const productStats = new Map<string, { count: number, revenue: number }>();
  orderItems.forEach(item => {
    const name = item.product.name;
    const current = productStats.get(name) || { count: 0, revenue: 0 };
    productStats.set(name, {
      count: current.count + item.quantity,
      revenue: current.revenue + (item.price * item.quantity)
    });
  });

  const topProducts = Array.from(productStats.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Relatórios e Métricas</h1>
        <p className="text-[var(--text-secondary)] mt-2">Acompanhe o desempenho das suas vendas.</p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
        <div className="card" style={{ padding: "1.5rem", backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)" }}>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Faturamento Total</p>
          <p style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--success)" }}>R$ {totalRevenue.toFixed(2)}</p>
        </div>
        <div className="card" style={{ padding: "1.5rem", backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)" }}>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Total de Pedidos</p>
          <p style={{ fontSize: "1.75rem", fontWeight: 700 }}>{totalCount}</p>
        </div>
        <div className="card" style={{ padding: "1.5rem", backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)" }}>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Ticket Médio</p>
          <p style={{ fontSize: "1.75rem", fontWeight: 700 }}>R$ {averageTicket.toFixed(2)}</p>
        </div>
      </div>

      {/* Top Products Table */}
      <div className="card" style={{ padding: "1.5rem", backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)" }}>
        <h3 style={{ fontWeight: 700, marginBottom: "1.5rem" }}>🔥 Produtos mais vendidos</h3>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
              <th style={{ padding: "0.75rem", color: "var(--text-secondary)" }}>Produto</th>
              <th style={{ padding: "0.75rem", color: "var(--text-secondary)" }}>Qtd. Vendida</th>
              <th style={{ padding: "0.75rem", color: "var(--text-secondary)" }}>Faturamento</th>
            </tr>
          </thead>
          <tbody>
            {topProducts.map(([name, stats]) => (
              <tr key={name} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "0.75rem", fontWeight: 500 }}>{name}</td>
                <td style={{ padding: "0.75rem" }}>{stats.count}</td>
                <td style={{ padding: "0.75rem" }}>R$ {stats.revenue.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
