"use client";

import { useState } from "react";

type Customer = {
  id: string;
  name: string;
  phone: string;
  totalOrders: number;
  lastOrderDate: string | null;
  lastAddress: string;
};

export default function CustomersClient({ initialCustomers }: { initialCustomers: Customer[] }) {
  const [search, setSearch] = useState("");

  const filtered = initialCustomers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone.includes(search)
  );

  return (
    <div className="card" style={{ padding: "1.5rem", backgroundColor: "var(--surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)" }}>
      <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <input 
          type="text" 
          placeholder="Buscar cliente por nome ou telefone..." 
          className="input-field"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: "400px" }}
        />
        <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
          Total: {filtered.length} clientes
        </span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
              <th style={{ padding: "0.75rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>Nome</th>
              <th style={{ padding: "0.75rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>Telefone</th>
              <th style={{ padding: "0.75rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>Último Endereço</th>
              <th style={{ padding: "0.75rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>Última Compra</th>
              <th style={{ padding: "0.75rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>Total Pedidos</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>Nenhum cliente encontrado.</td>
              </tr>
            ) : filtered.map(c => (
              <tr key={c.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "0.75rem", fontSize: "0.875rem", fontWeight: 500 }}>{c.name}</td>
                <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>{c.phone}</td>
                <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>{c.lastAddress}</td>
                <td style={{ padding: "0.75rem", fontSize: "0.875rem", fontVariantNumeric: "tabular-nums" }} suppressHydrationWarning>
                  {c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString("pt-BR") : "-"}
                </td>
                <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>
                  <span style={{ backgroundColor: "var(--primary-light)", color: "var(--primary)", padding: "0.1rem 0.5rem", borderRadius: "1rem", fontWeight: 600 }}>
                    {c.totalOrders}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
