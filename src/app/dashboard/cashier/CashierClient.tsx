"use client";

import React, { useState } from "react";
import { openCashier, closeCashier } from "./actions";

type Order = {
  id: string;
  totalAmount: number;
  paymentMethod: string;
  status: string;
  createdAt: Date | string;
  customer: { name: string };
};

type Cashier = {
  id: string;
  status: string;
  openedAt: Date | string;
  closedAt?: Date | string | null;
  initialValue: number;
  finalValue?: number | null;
  orders: Order[];
};

type Props = {
  activeCashier: Cashier | null;
  history: Cashier[];
};

function calculateSummary(orders: Order[], initialValue: number = 0) {
  // Only count orders that are not canceled
  const validOrders = orders.filter(o => o.status !== "CANCELED");
  
  let pix = 0;
  let cash = 0;
  let card = 0;

  validOrders.forEach(o => {
    if (o.paymentMethod === "PIX") pix += o.totalAmount;
    if (o.paymentMethod === "CASH") cash += o.totalAmount;
    if (o.paymentMethod === "CARD") card += o.totalAmount;
  });

  return { pix, cash, card, total: pix + cash + card, expectedInDrawer: initialValue + cash };
}

export default function CashierClient({ activeCashier, history }: Props) {
  const [initialValue, setInitialValue] = useState("0");
  const [isLoading, setIsLoading] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const handleOpen = async () => {
    try {
      setIsLoading(true);
      await openCashier(parseFloat(initialValue));
      alert("Caixa aberto com sucesso!");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = async () => {
    if (!activeCashier) return;
    if (!confirm("Tem certeza que deseja fechar o caixa?")) return;

    try {
      setIsLoading(true);
      await closeCashier(activeCashier.id);
      alert("Caixa fechado com sucesso!");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const activeSummary = activeCashier ? calculateSummary(activeCashier.orders, activeCashier.initialValue) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      
      {/* STATUS DO CAIXA */}
      <div className="card" style={{ padding: "1.5rem", backgroundColor: "var(--surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>🏧 Fluxo de Caixa</h2>
          <span style={{ 
            padding: "0.25rem 0.75rem", 
            borderRadius: "2rem", 
            fontSize: "0.875rem", 
            fontWeight: 600,
            backgroundColor: activeCashier ? "var(--success-light)" : "var(--error-light)",
            color: activeCashier ? "var(--success)" : "var(--error)"
          }}>
            {activeCashier ? "CAIXA ABERTO" : "CAIXA FECHADO"}
          </span>
        </div>

        {!activeCashier ? (
          <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <label className="label">Valor Inicial (Fundo de Caixa)</label>
              <input 
                type="number" 
                className="input-field" 
                value={initialValue} 
                onChange={e => setInitialValue(e.target.value)}
              />
            </div>
            <button 
              onClick={handleOpen}
              disabled={isLoading}
              className="btn-primary"
              style={{ height: "42px", padding: "0 2rem" }}
            >
              {isLoading ? "Abrindo..." : "Abrir Caixa"}
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
              <div style={{ padding: "1rem", backgroundColor: "var(--background)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Aberto em</p>
                <p style={{ fontWeight: 600 }}>{new Date(activeCashier.openedAt).toLocaleString()}</p>
              </div>
              <div style={{ padding: "1rem", backgroundColor: "var(--background)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Valor Inicial</p>
                <p style={{ fontWeight: 600 }}>R$ {activeCashier.initialValue.toFixed(2)}</p>
              </div>
              <div style={{ padding: "1rem", backgroundColor: "var(--background)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", borderLeft: "4px solid var(--primary)" }}>
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Vendas Dinheiro</p>
                <p style={{ fontWeight: 600 }}>R$ {activeSummary?.cash.toFixed(2)}</p>
              </div>
              <div style={{ padding: "1rem", backgroundColor: "var(--background)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", borderLeft: "4px solid #10b981" }}>
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Vendas PIX</p>
                <p style={{ fontWeight: 600 }}>R$ {activeSummary?.pix.toFixed(2)}</p>
              </div>
              <div style={{ padding: "1rem", backgroundColor: "var(--background)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", borderLeft: "4px solid #f59e0b" }}>
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Vendas Cartão</p>
                <p style={{ fontWeight: 600 }}>R$ {activeSummary?.card.toFixed(2)}</p>
              </div>
              <div style={{ padding: "1rem", backgroundColor: "var(--background)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Total Esperado na Gaveta</p>
                <p style={{ fontWeight: 700, fontSize: "1.1rem" }}>R$ {activeSummary?.expectedInDrawer.toFixed(2)}</p>
              </div>
            </div>

            <button 
              onClick={handleClose}
              disabled={isLoading}
              className="btn-primary"
              style={{ 
                width: "100%", 
                backgroundColor: "var(--error)", 
                color: "white", 
                border: "none",
                padding: "0.75rem"
              }}
            >
              {isLoading ? "Processando..." : "Finalizar Sessão e Fechar Caixa"}
            </button>
          </div>
        )}
      </div>

      {/* HISTÓRICO */}
      <div className="card" style={{ padding: "1.5rem", backgroundColor: "var(--surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)" }}>
        <h3 style={{ fontWeight: 700, marginBottom: "1rem" }}>Histórico de Caixas</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                <th style={{ padding: "0.75rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>Abertura</th>
                <th style={{ padding: "0.75rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>Fechamento</th>
                <th style={{ padding: "0.75rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>Entradas/Vendas</th>
                <th style={{ padding: "0.75rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>V. Esperado na Gaveta</th>
                <th style={{ padding: "0.75rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {history.map(item => {
                const summary = calculateSummary(item.orders, item.initialValue);
                const isExpanded = expandedRow === item.id;

                return (
                  <React.Fragment key={item.id}>
                    <tr style={{ borderBottom: "1px solid var(--border)", backgroundColor: isExpanded ? "var(--background)" : "transparent" }}>
                      <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>{new Date(item.openedAt).toLocaleString()}</td>
                      <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>{item.closedAt ? new Date(item.closedAt).toLocaleString() : <span style={{ color: "var(--success)", fontWeight: 600 }}>Atual</span>}</td>
                      <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>R$ {summary.total.toFixed(2)}</td>
                      <td style={{ padding: "0.75rem", fontSize: "0.875rem", fontWeight: 600 }}>R$ {summary.expectedInDrawer.toFixed(2)}</td>
                      <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>
                        <button 
                          onClick={() => setExpandedRow(isExpanded ? null : item.id)}
                          style={{ color: "var(--primary)", fontWeight: 500 }}
                        >
                          {isExpanded ? "Esconder Pedidos" : "Ver Pedidos"}
                        </button>
                      </td>
                    </tr>
                    
                    {/* Expandable Order List */}
                    {isExpanded && (
                      <tr style={{ backgroundColor: "var(--background)" }}>
                        <td colSpan={5} style={{ padding: "1rem" }}>
                          <div style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "1rem" }}>
                            <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                              <span style={{ fontSize: "0.8rem", padding: "0.2rem 0.5rem", borderRadius: "1rem", border: "1px solid var(--border)" }}>Dinheiro: R$ {summary.cash.toFixed(2)}</span>
                              <span style={{ fontSize: "0.8rem", padding: "0.2rem 0.5rem", borderRadius: "1rem", border: "1px solid var(--border)" }}>PIX: R$ {summary.pix.toFixed(2)}</span>
                              <span style={{ fontSize: "0.8rem", padding: "0.2rem 0.5rem", borderRadius: "1rem", border: "1px solid var(--border)" }}>Cartão: R$ {summary.card.toFixed(2)}</span>
                            </div>
                            
                            <table style={{ width: "100%", fontSize: "0.875rem" }}>
                              <thead>
                                <tr style={{ borderBottom: "1px dashed var(--border)", textAlign: "left" }}>
                                  <th style={{ padding: "0.5rem 0", color: "var(--text-secondary)" }}>Pedido #</th>
                                  <th style={{ padding: "0.5rem 0", color: "var(--text-secondary)" }}>Data</th>
                                  <th style={{ padding: "0.5rem 0", color: "var(--text-secondary)" }}>Cliente</th>
                                  <th style={{ padding: "0.5rem 0", color: "var(--text-secondary)" }}>Método</th>
                                  <th style={{ padding: "0.5rem 0", color: "var(--text-secondary)" }}>Status</th>
                                  <th style={{ padding: "0.5rem 0", color: "var(--text-secondary)", textAlign: "right" }}>Valor</th>
                                </tr>
                              </thead>
                              <tbody>
                                {item.orders.length === 0 ? (
                                  <tr>
                                    <td colSpan={6} style={{ padding: "1rem 0", textAlign: "center", color: "var(--text-secondary)" }}>Nenhum pedido nesta sessão.</td>
                                  </tr>
                                ) : item.orders.map(o => (
                                  <tr key={o.id} style={{ borderBottom: "1px solid var(--background)" }}>
                                    <td style={{ padding: "0.5rem 0" }}>{o.id.slice(-6).toUpperCase()}</td>
                                    <td style={{ padding: "0.5rem 0" }}>{new Date(o.createdAt).toLocaleTimeString()}</td>
                                    <td style={{ padding: "0.5rem 0" }}>{o.customer?.name}</td>
                                    <td style={{ padding: "0.5rem 0" }}>{o.paymentMethod}</td>
                                    <td style={{ padding: "0.5rem 0" }}>
                                      <span style={{ 
                                        color: o.status === "CANCELED" ? "var(--error)" : o.status === "DELIVERED" ? "var(--success)" : "inherit",
                                        textDecoration: o.status === "CANCELED" ? "line-through" : "none"
                                      }}>
                                        {o.status}
                                      </span>
                                    </td>
                                    <td style={{ padding: "0.5rem 0", textAlign: "right", fontWeight: o.status === "CANCELED" ? 400 : 600 }}>R$ {o.totalAmount.toFixed(2)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
