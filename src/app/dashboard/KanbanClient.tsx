"use client";

import { useState } from "react";
import { updateOrderStatus, assignCourierAndDispatch, cancelOrder } from "./actions";

type OrderItem = {
  id: string;
  quantity: number;
  price: number;
  product: { name: string };
};

type Order = {
  id: string;
  status: string;
  totalAmount: number;
  deliveryFee: number;
  cep: string;
  street: string;
  number: string;
  neighborhood: string;
  complement: string | null;
  city: string;
  state: string;
  paymentMethod: string;
  changeFor: number | null;
  observation: string | null;
  cancelReason: string | null;
  createdAt: string;
  customer: { name: string; phone: string };
  courier: { name: string } | null;
  items: OrderItem[];
};

type Courier = { id: string; name: string };

const COLUMNS = [
  { status: "PENDING", label: "🔔 Pendentes", color: "#f59e0b", nextStatus: "ACCEPTED", nextLabel: "Aceitar" },
  { status: "ACCEPTED", label: "✅ Aceitos", color: "#3b82f6", nextStatus: "PREPARING", nextLabel: "Preparar" },
  { status: "PREPARING", label: "👨‍🍳 Preparando", color: "#8b5cf6", nextStatus: "READY", nextLabel: "Pronto" },
  { status: "READY", label: "📦 Pronto", color: "#06b6d4", nextStatus: "DISPATCHED", nextLabel: "Despachar" },
  { status: "DISPATCHED", label: "🏍️ A Caminho", color: "#10b981", nextStatus: "DELIVERED", nextLabel: "Entregue" },
  { status: "DELIVERED", label: "🎉 Entregues", color: "#22c55e", nextStatus: null, nextLabel: null },
];

const PAYMENT_LABELS: Record<string, string> = {
  PIX: "PIX",
  CARD: "Cartão",
  CASH: "Dinheiro",
};

export default function KanbanClient({ orders, couriers }: { orders: Order[]; couriers: Courier[] }) {
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [loadingOrderId, setLoadingOrderId] = useState<string | null>(null);
  
  // Courier selection modal
  const [dispatchOrderId, setDispatchOrderId] = useState<string | null>(null);
  const [selectedCourierId, setSelectedCourierId] = useState("");

  const handleAdvance = async (orderId: string, currentStatus: string, nextStatus: string) => {
    // If moving from READY to DISPATCHED, show courier selection
    if (currentStatus === "READY") {
      setDispatchOrderId(orderId);
      setSelectedCourierId("");
      return;
    }

    setLoadingOrderId(orderId);
    try {
      await updateOrderStatus(orderId, nextStatus);
    } catch {
      alert("Erro ao atualizar status.");
    } finally {
      setLoadingOrderId(null);
    }
  };

  const handleDispatch = async () => {
    if (!dispatchOrderId || !selectedCourierId) return;
    setLoadingOrderId(dispatchOrderId);
    try {
      await assignCourierAndDispatch(dispatchOrderId, selectedCourierId);
      setDispatchOrderId(null);
    } catch {
      alert("Erro ao despachar pedido.");
    } finally {
      setLoadingOrderId(null);
    }
  };

  const handleCancel = async (orderId: string) => {
    const reason = prompt("Motivo do cancelamento:");
    if (!reason) return;
    setLoadingOrderId(orderId);
    try {
      await cancelOrder(orderId, reason);
    } catch {
      alert("Erro ao cancelar.");
    } finally {
      setLoadingOrderId(null);
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  };

  const canceledOrders = orders.filter(o => o.status === "CANCELED");

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>Painel de Pedidos</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
          Gerencie os pedidos recebidos. Avance cada pedido pelas etapas.
        </p>
      </div>

      {/* PAINEL DE PEDIDOS */}
      <div style={{ display: "flex", gap: "1rem", overflowX: "auto", paddingBottom: "1rem", minHeight: "60vh" }}>
        {COLUMNS.map(col => {
          const columnOrders = orders.filter(o => o.status === col.status);
          return (
            <div key={col.status} style={{ 
              minWidth: "280px", maxWidth: "320px", flex: "1 0 280px",
              display: "flex", flexDirection: "column",
              backgroundColor: "var(--background)", borderRadius: "var(--radius-lg)", 
              border: "1px solid var(--border)", overflow: "hidden"
            }}>
              {/* Column Header */}
              <div style={{ padding: "1rem", borderBottom: `2px solid ${col.color}`, display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "var(--surface)" }}>
                <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{col.label}</span>
                <span style={{ backgroundColor: col.color, color: "white", width: "24px", height: "24px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700 }}>
                  {columnOrders.length}
                </span>
              </div>

              {/* Cards */}
              <div style={{ flex: 1, padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.75rem", overflowY: "auto" }}>
                {columnOrders.length === 0 && (
                  <div style={{ textAlign: "center", padding: "2rem 0.5rem", color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                    Nenhum pedido
                  </div>
                )}
                {columnOrders.map(order => (
                  <div key={order.id} style={{ 
                    backgroundColor: "var(--surface)", borderRadius: "var(--radius-md)", 
                    border: "1px solid var(--border)", overflow: "hidden", transition: "box-shadow 0.2s",
                    boxShadow: expandedOrder === order.id ? "0 4px 12px rgba(0,0,0,0.1)" : "var(--shadow-sm)"
                  }}>
                    {/* Card Header */}
                    <div onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)} style={{ padding: "0.75rem", cursor: "pointer" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.8rem", color: col.color }}>#{order.id.slice(-6).toUpperCase()}</span>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{formatDate(order.createdAt)} {formatTime(order.createdAt)}</span>
                      </div>
                      <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.25rem" }}>{order.customer.name}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                          {order.items.length} {order.items.length === 1 ? "item" : "itens"}
                          {order.courier && ` • 🏍️ ${order.courier.name}`}
                        </span>
                        <span style={{ fontWeight: 700, color: "var(--primary)", fontSize: "0.95rem" }}>
                          R$ {order.totalAmount.toFixed(2).replace(".", ",")}
                        </span>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedOrder === order.id && (
                      <div style={{ borderTop: "1px solid var(--border)", padding: "0.75rem", fontSize: "0.8rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <div>
                          <strong>Itens:</strong>
                          {order.items.map(item => (
                            <div key={item.id} style={{ color: "var(--text-secondary)", marginLeft: "0.5rem" }}>
                              {item.quantity}x {item.product.name} — R$ {(item.price * item.quantity).toFixed(2).replace(".", ",")}
                            </div>
                          ))}
                        </div>
                        {order.deliveryFee > 0 && <div>🚚 Entrega: R$ {order.deliveryFee.toFixed(2).replace(".", ",")}</div>}
                        <div>
                          <strong>📍 Endereço:</strong>
                          <div style={{ color: "var(--text-secondary)", marginLeft: "0.5rem" }}>
                            {order.street}, {order.number}{order.complement && ` - ${order.complement}`}
                            <br/>{order.neighborhood}, {order.city}/{order.state}
                          </div>
                        </div>
                        <div>💳 {PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}
                          {order.paymentMethod === "CASH" && order.changeFor && ` (Troco: R$ ${order.changeFor.toFixed(2).replace(".", ",")})`}
                        </div>
                        <div>📱 {order.customer.phone}</div>
                        {order.courier && <div>🏍️ Entregador: <strong>{order.courier.name}</strong></div>}
                        {order.observation && (
                          <div style={{ backgroundColor: "var(--background)", padding: "0.5rem", borderRadius: "var(--radius-sm)", fontStyle: "italic" }}>
                            📝 {order.observation}
                          </div>
                        )}

                        {/* Actions */}
                        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                          {col.nextStatus && (
                            <button 
                              onClick={() => handleAdvance(order.id, col.status, col.nextStatus!)}
                              disabled={loadingOrderId === order.id}
                              style={{ flex: 1, padding: "0.5rem", borderRadius: "var(--radius-md)", backgroundColor: col.color, color: "white", border: "none", fontWeight: 600, fontSize: "0.8rem", cursor: "pointer", opacity: loadingOrderId === order.id ? 0.6 : 1 }}
                            >
                              {loadingOrderId === order.id ? "..." : col.nextLabel}
                            </button>
                          )}
                          {col.status !== "DELIVERED" && (
                            <button 
                              onClick={() => handleCancel(order.id)}
                              disabled={loadingOrderId === order.id}
                              style={{ padding: "0.5rem 0.75rem", borderRadius: "var(--radius-md)", backgroundColor: "var(--error-light)", color: "var(--error)", border: "1px solid var(--error)", fontWeight: 600, fontSize: "0.8rem", cursor: "pointer" }}
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* COURIER SELECTION MODAL */}
      {dispatchOrderId && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)", zIndex: 200,
          display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(4px)"
        }}>
          <div style={{
            backgroundColor: "var(--surface)", borderRadius: "var(--radius-lg)",
            padding: "2rem", width: "90%", maxWidth: "400px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
          }}>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>🏍️ Selecionar Entregador</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
              Escolha o entregador para o pedido <strong>#{dispatchOrderId.slice(-6).toUpperCase()}</strong>. Ele receberá os detalhes por WhatsApp.
            </p>

            {couriers.length === 0 ? (
              <div style={{ textAlign: "center", padding: "1.5rem", border: "1px dashed var(--border)", borderRadius: "var(--radius-md)", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                Nenhum entregador cadastrado.<br/>Cadastre em &ldquo;Entregadores&rdquo; no menu.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem" }}>
                {couriers.map(c => (
                  <label key={c.id} style={{
                    display: "flex", alignItems: "center", gap: "0.75rem",
                    padding: "0.75rem 1rem", borderRadius: "var(--radius-md)",
                    border: selectedCourierId === c.id ? `2px solid var(--primary)` : "1px solid var(--border)",
                    backgroundColor: selectedCourierId === c.id ? "var(--primary-light)" : "var(--background)",
                    cursor: "pointer", transition: "all 0.15s"
                  }}>
                    <input
                      type="radio"
                      name="courier"
                      value={c.id}
                      checked={selectedCourierId === c.id}
                      onChange={() => setSelectedCourierId(c.id)}
                      style={{ accentColor: "var(--primary)" }}
                    />
                    <span style={{ fontWeight: 500 }}>🏍️ {c.name}</span>
                  </label>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                onClick={() => setDispatchOrderId(null)}
                className="btn-secondary"
                style={{ flex: 1, padding: "0.75rem" }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDispatch}
                disabled={!selectedCourierId || loadingOrderId === dispatchOrderId}
                className="btn-primary"
                style={{ flex: 1, padding: "0.75rem", opacity: !selectedCourierId ? 0.5 : 1 }}
              >
                {loadingOrderId === dispatchOrderId ? "Despachando..." : "Despachar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCELED ORDERS */}
      {canceledOrders.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--error)", marginBottom: "1rem" }}>
            ❌ Cancelados ({canceledOrders.length})
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {canceledOrders.map(order => (
              <div key={order.id} style={{ 
                backgroundColor: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)", padding: "0.75rem",
                display: "flex", justifyContent: "space-between", alignItems: "center", opacity: 0.7
              }}>
                <div>
                  <span style={{ fontWeight: 700, color: "var(--error)", fontSize: "0.85rem" }}>#{order.id.slice(-6).toUpperCase()}</span>
                  <span style={{ marginLeft: "0.75rem", fontSize: "0.85rem" }}>{order.customer.name}</span>
                  <span style={{ marginLeft: "0.75rem", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    R$ {order.totalAmount.toFixed(2).replace(".", ",")}
                  </span>
                </div>
                {order.cancelReason && (
                  <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontStyle: "italic" }}>
                    &ldquo;{order.cancelReason}&rdquo;
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
