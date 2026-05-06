"use client";

import { useState } from "react";
import { openCashier, closeCashier } from "./actions";

type Cashier = {
  id: string;
  status: string;
  openedAt: Date;
  initialValue: number;
};

type Props = {
  activeCashier: Cashier | null;
  history: any[];
};

export default function CashierClient({ activeCashier, history }: Props) {
  const [initialValue, setInitialValue] = useState("0");
  const [isLoading, setIsLoading] = useState(false);

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
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div style={{ padding: "1rem", backgroundColor: "var(--background)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Aberto em</p>
                <p style={{ fontWeight: 600 }}>{new Date(activeCashier.openedAt).toLocaleString()}</p>
              </div>
              <div style={{ padding: "1rem", backgroundColor: "var(--background)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Valor Inicial</p>
                <p style={{ fontWeight: 600 }}>R$ {activeCashier.initialValue.toFixed(2)}</p>
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
                marginTop: "1rem"
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
                <th style={{ padding: "0.75rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>V. Inicial</th>
                <th style={{ padding: "0.75rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>V. Final</th>
                <th style={{ padding: "0.75rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map(item => (
                <tr key={item.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>{new Date(item.openedAt).toLocaleString()}</td>
                  <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>{item.closedAt ? new Date(item.closedAt).toLocaleString() : "-"}</td>
                  <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>R$ {item.initialValue.toFixed(2)}</td>
                  <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>{item.finalValue ? `R$ ${item.finalValue.toFixed(2)}` : "-"}</td>
                  <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>
                    <span style={{ 
                      fontSize: "0.75rem", 
                      padding: "0.1rem 0.4rem", 
                      borderRadius: "0.25rem",
                      backgroundColor: item.status === "OPEN" ? "var(--success-light)" : "var(--border)",
                      color: item.status === "OPEN" ? "var(--success)" : "var(--text-secondary)"
                    }}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
