"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { updateOrderStatus, assignCourierAndDispatch, cancelOrder, getUberQuote, dispatchViaUberDirect } from "./actions";
import { openCashier } from "./cashier/actions";

type OrderItem = {
  id: string;
  quantity: number;
  price: number;
  product: { name: string };
  addons?: { addonOption: { name: string } }[];
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

export default function KanbanClient({ 
  orders, 
  couriers, 
  isCashierOpen,
  uberEnabled 
}: { 
  orders: Order[]; 
  couriers: Courier[];
  isCashierOpen: boolean;
  uberEnabled?: boolean;
}) {
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [loadingOrderId, setLoadingOrderId] = useState<string | null>(null);
  
  // Mobile Tab State
  const [activeTab, setActiveTab] = useState<string>("PENDING");
  // Print State
  const [orderToPrint, setOrderToPrint] = useState<Order | null>(null);

  // Courier selection modal
  const [dispatchOrderId, setDispatchOrderId] = useState<string | null>(null);
  const [selectedCourierId, setSelectedCourierId] = useState("");

  // Uber Direct state
  const [dispatchMode, setDispatchMode] = useState<"courier" | "uber">("courier");
  const [uberQuote, setUberQuote] = useState<{ fee: number; estimatedMinutes: number; quoteId: string } | null>(null);
  const [uberLoading, setUberLoading] = useState(false);
  const [uberError, setUberError] = useState<string | null>(null);

  const router = useRouter();
  const prevPendingCount = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 1. Inicializar áudio e Polling para novos pedidos
  useEffect(() => {
    // Som de notificação (Campainha de recepção)
    audioRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");

    // Atualizar a página a cada 15 segundos para buscar novos pedidos
    const interval = setInterval(() => {
      router.refresh();
    }, 15000);

    return () => clearInterval(interval);
  }, [router]);

  // 2. Monitorar novos pedidos PENDING para tocar o som
  useEffect(() => {
    const pendingOrders = orders.filter(o => o.status === "PENDING");
    const currentCount = pendingOrders.length;

    // Se o número de pendentes aumentou, toca o som
    if (currentCount > prevPendingCount.current) {
      audioRef.current?.play().catch(e => console.log("Erro ao tocar áudio (autoplay bloqueado):", e));
    }

    prevPendingCount.current = currentCount;
  }, [orders]);

  const handleAdvance = async (orderId: string, currentStatus: string, nextStatus: string) => {
    // 1. Trava de segurança: Se for aceitar pedido e o caixa estiver fechado
    if (nextStatus === "ACCEPTED" && !isCashierOpen) {
      const confirmOpen = confirm("⚠️ O Caixa está FECHADO. Deseja abrir o caixa agora para aceitar este pedido?");
      if (confirmOpen) {
        const val = prompt("Digite o valor inicial do caixa (R$):", "0");
        if (val !== null) {
          try {
            setLoadingOrderId(orderId);
            await openCashier(parseFloat(val.replace(",", ".")) || 0);
            // Após abrir o caixa, continua para aceitar o pedido
          } catch (err: any) {
            alert("Erro ao abrir caixa: " + err.message);
            setLoadingOrderId(null);
            return;
          }
        } else {
          return; // Cancelou o prompt do valor
        }
      } else {
        return; // Cancelou a abertura
      }
    }

    // If moving from READY to DISPATCHED, show dispatch modal
    if (currentStatus === "READY") {
      setDispatchOrderId(orderId);
      setSelectedCourierId("");
      setDispatchMode("courier");
      setUberQuote(null);
      setUberError(null);
      return;
    }

    setLoadingOrderId(orderId);
    try {
      await updateOrderStatus(orderId, nextStatus);
      if (nextStatus === "ACCEPTED") {
        const acceptedOrder = orders.find(o => o.id === orderId);
        if (acceptedOrder) {
          setOrderToPrint(acceptedOrder);
        }
      }
    } catch {
      alert("Erro ao atualizar status.");
    } finally {
      setLoadingOrderId(null);
    }
  };

  useEffect(() => {
    if (orderToPrint) {
      setTimeout(() => {
        window.print();
        setOrderToPrint(null);
      }, 500);
    }
  }, [orderToPrint]);

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

  // Uber Direct: Get Quote
  const handleUberQuote = async () => {
    if (!dispatchOrderId) return;
    setUberLoading(true);
    setUberError(null);
    setUberQuote(null);
    try {
      const quote = await getUberQuote(dispatchOrderId);
      setUberQuote(quote);
    } catch (err: any) {
      setUberError(err.message || "Erro ao cotar entrega Uber.");
    } finally {
      setUberLoading(false);
    }
  };

  // Uber Direct: Dispatch
  const handleUberDispatch = async () => {
    if (!dispatchOrderId || !uberQuote) return;
    setLoadingOrderId(dispatchOrderId);
    try {
      const result = await dispatchViaUberDirect(dispatchOrderId, uberQuote.quoteId);
      setDispatchOrderId(null);
      setUberQuote(null);
      if (result.trackingUrl) {
        console.log("Uber tracking:", result.trackingUrl);
      }
    } catch (err: any) {
      alert("Erro ao despachar via Uber: " + (err.message || "Tente novamente."));
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
    <div className="kanban-container">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #print-receipt, #print-receipt * {
            visibility: visible;
          }
          #print-receipt {
            position: absolute;
            left: 8mm; /* Aumentado para 8mm para parar de cortar a esquerda */
            top: 2mm; /* Adicionado margem superior para evitar corte no topo */
            width: 46mm; /* Ajustado para compensar a margem maior */
            padding: 0;
            margin: 0;
            font-family: monospace;
            font-size: 13px; /* Aumentado a fonte para melhor legibilidade */
            color: #000;
          }
          @page {
            margin: 0;
          }
        }
        .kanban-board {
          display: flex;
          gap: 1rem;
          overflow-x: auto;
          padding-bottom: 1rem;
          min-height: 60vh;
        }
        .mobile-tabs {
          display: none;
        }
        @media (max-width: 767px) {
          .kanban-col {
            display: none !important;
          }
          .kanban-col.active {
            display: flex !important;
            min-width: 100% !important;
            max-width: 100% !important;
          }
          .mobile-tabs {
            display: block;
            margin-bottom: 1rem;
          }
        }
      `}} />
      
      {orderToPrint && (
        <div id="print-receipt">
          <div style={{ textAlign: "center", marginBottom: "10px" }}>
            <strong>PEDIDO #{orderToPrint.id.slice(-6).toUpperCase()}</strong><br/>
            {formatDate(orderToPrint.createdAt)} {formatTime(orderToPrint.createdAt)}
          </div>
          <div style={{ borderBottom: "1px dashed #000", marginBottom: "10px" }}></div>
          <div><strong>Cliente:</strong> {orderToPrint.customer.name}</div>
          <div><strong>Telefone:</strong> {orderToPrint.customer.phone}</div>
          <div style={{ borderBottom: "1px dashed #000", margin: "10px 0" }}></div>
          <div><strong>Itens:</strong></div>
          {orderToPrint.items.map(item => (
            <div key={item.id} style={{ marginBottom: "5px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{item.quantity}x {item.product.name}</span>
                <span>R$ {(item.price * item.quantity).toFixed(2).replace(".", ",")}</span>
              </div>
              {item.addons && item.addons.length > 0 && (
                <div style={{ paddingLeft: "10px", fontSize: "11px", fontStyle: "italic", color: "#333" }}>
                  L {item.addons.map(a => a.addonOption.name).join(', ')}
                </div>
              )}
            </div>
          ))}
          <div style={{ borderBottom: "1px dashed #000", margin: "10px 0" }}></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Subtotal:</span>
            <span>R$ {(orderToPrint.totalAmount - orderToPrint.deliveryFee).toFixed(2).replace(".", ",")}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Taxa de Entrega:</span>
            <span>R$ {orderToPrint.deliveryFee.toFixed(2).replace(".", ",")}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", marginTop: "5px" }}>
            <span>Total:</span>
            <span>R$ {orderToPrint.totalAmount.toFixed(2).replace(".", ",")}</span>
          </div>
          <div style={{ borderBottom: "1px dashed #000", margin: "10px 0" }}></div>
          <div><strong>Pagamento:</strong> {PAYMENT_LABELS[orderToPrint.paymentMethod] || orderToPrint.paymentMethod}</div>
          {orderToPrint.paymentMethod === "CASH" && orderToPrint.changeFor && (
            <div><strong>Troco para:</strong> R$ {orderToPrint.changeFor.toFixed(2).replace(".", ",")}</div>
          )}
          <div style={{ borderBottom: "1px dashed #000", margin: "10px 0" }}></div>
          <div><strong>Endereço de Entrega:</strong></div>
          <div>{orderToPrint.street}, {orderToPrint.number}{orderToPrint.complement && ` - ${orderToPrint.complement}`}</div>
          <div>{orderToPrint.neighborhood}, {orderToPrint.city}/{orderToPrint.state}</div>
          {orderToPrint.observation && (
            <>
              <div style={{ borderBottom: "1px dashed #000", margin: "10px 0" }}></div>
              <div><strong>Obs:</strong> {orderToPrint.observation}</div>
            </>
          )}
          <div style={{ textAlign: "center", marginTop: "15px", fontSize: "10px" }}>
            Obrigado pela preferência!
          </div>
        </div>
      )}

      <div className="no-print">
        <div style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>Painel de Pedidos</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            Gerencie os pedidos recebidos. Avance cada pedido pelas etapas.
          </p>
        </div>

        <div className="mobile-tabs">
          <label style={{ fontWeight: 600, fontSize: "0.9rem", marginRight: "0.5rem" }}>Fase do Pedido:</label>
          <select 
            value={activeTab} 
            onChange={(e) => setActiveTab(e.target.value)}
            style={{ 
              padding: "0.5rem", borderRadius: "var(--radius-md)", 
              border: "1px solid var(--border)", backgroundColor: "var(--surface)", 
              fontSize: "1rem", width: "100%", marginTop: "0.5rem",
              color: "var(--text-primary)"
            }}
          >
            {COLUMNS.map(col => (
              <option key={col.status} value={col.status}>
                {col.label} ({orders.filter(o => o.status === col.status).length})
              </option>
            ))}
          </select>
        </div>

        {/* PAINEL DE PEDIDOS */}
        <div className="kanban-board">
          {COLUMNS.map(col => {
            const columnOrders = orders.filter(o => o.status === col.status);
            return (
              <div key={col.status} className={`kanban-col ${activeTab === col.status ? 'active' : ''}`} style={{ 
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
                            <div key={item.id} style={{ color: "var(--text-secondary)", marginLeft: "0.5rem", marginBottom: "0.25rem" }}>
                              <div>{item.quantity}x {item.product.name} — R$ {(item.price * item.quantity).toFixed(2).replace(".", ",")}</div>
                              {item.addons && item.addons.length > 0 && (
                                <div style={{ fontSize: "0.75rem", paddingLeft: "1.2rem", fontStyle: "italic" }}>
                                  └ {item.addons.map(a => a.addonOption.name).join(", ")}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        {order.deliveryFee > 0 && <div>🚚 Entrega: R$ {order.deliveryFee.toFixed(2).replace(".", ",")}</div>}
                        
                        {!order.cep ? (
                          <div>
                            <strong>📍 Retirada na Loja</strong>
                          </div>
                        ) : (
                          <div>
                            <strong>📍 Endereço:</strong>
                            <div style={{ color: "var(--text-secondary)", marginLeft: "0.5rem", wordBreak: "break-word", overflowWrap: "anywhere" }}>
                              {order.street}, {order.number}{order.complement && ` - ${order.complement}`}
                              <br/>{order.neighborhood}, {order.city}/{order.state}
                            </div>
                          </div>
                        )}
                        
                        <div>💳 {PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}
                          {order.paymentMethod === "CASH" && order.changeFor && ` (Troco: R$ ${order.changeFor.toFixed(2).replace(".", ",")})`}
                        </div>
                        <div>📱 {order.customer.phone}</div>
                        {order.courier && <div>🏍️ Entregador: <strong>{order.courier.name}</strong></div>}
                        {order.observation && (
                          <div style={{ backgroundColor: "var(--background)", padding: "0.5rem", borderRadius: "var(--radius-sm)", fontStyle: "italic", wordBreak: "break-word", overflowWrap: "anywhere" }}>
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

      {/* DISPATCH MODAL (Entregador Próprio + Uber Direct) */}
      {dispatchOrderId && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)", zIndex: 200,
          display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(4px)"
        }}>
          <div style={{
            backgroundColor: "var(--surface)", borderRadius: "var(--radius-lg)",
            padding: "2rem", width: "90%", maxWidth: "440px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
          }}>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>📦 Despachar Pedido</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "1rem" }}>
              Pedido <strong>#{dispatchOrderId.slice(-6).toUpperCase()}</strong> — Escolha como enviar:
            </p>

            {/* Mode tabs */}
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
              <button
                onClick={() => setDispatchMode("courier")}
                style={{
                  flex: 1, padding: "0.6rem", borderRadius: "var(--radius-md)",
                  border: dispatchMode === "courier" ? "2px solid var(--primary)" : "1px solid var(--border)",
                  backgroundColor: dispatchMode === "courier" ? "var(--primary-light)" : "var(--background)",
                  fontWeight: 600, fontSize: "0.85rem", cursor: "pointer",
                  color: dispatchMode === "courier" ? "var(--primary)" : "var(--text-secondary)"
                }}
              >
                🏍️ Entregador Próprio
              </button>
              {uberEnabled && (
                <button
                  onClick={() => { setDispatchMode("uber"); if (!uberQuote && !uberLoading) handleUberQuote(); }}
                  style={{
                    flex: 1, padding: "0.6rem", borderRadius: "var(--radius-md)",
                    border: dispatchMode === "uber" ? "2px solid #000" : "1px solid var(--border)",
                    backgroundColor: dispatchMode === "uber" ? "#f5f5f5" : "var(--background)",
                    fontWeight: 600, fontSize: "0.85rem", cursor: "pointer",
                    color: dispatchMode === "uber" ? "#000" : "var(--text-secondary)"
                  }}
                >
                  🚗 Uber Direct
                </button>
              )}
            </div>

            {/* Courier mode */}
            {dispatchMode === "courier" && (
              <>
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
                        border: selectedCourierId === c.id ? "2px solid var(--primary)" : "1px solid var(--border)",
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
                  <button onClick={() => setDispatchOrderId(null)} className="btn-secondary" style={{ flex: 1, padding: "0.75rem" }}>Cancelar</button>
                  <button
                    onClick={handleDispatch}
                    disabled={!selectedCourierId || loadingOrderId === dispatchOrderId}
                    className="btn-primary"
                    style={{ flex: 1, padding: "0.75rem", opacity: !selectedCourierId ? 0.5 : 1 }}
                  >
                    {loadingOrderId === dispatchOrderId ? "Despachando..." : "Despachar"}
                  </button>
                </div>
              </>
            )}

            {/* Uber mode */}
            {dispatchMode === "uber" && (
              <>
                {uberLoading && (
                  <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>
                    <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>🔄</div>
                    Cotando entrega com a Uber...
                  </div>
                )}

                {uberError && (
                  <div style={{ padding: "1rem", backgroundColor: "var(--error-bg)", color: "var(--error)", borderRadius: "var(--radius-md)", marginBottom: "1rem", fontSize: "0.85rem" }}>
                    ❌ {uberError}
                  </div>
                )}

                {uberQuote && (
                  <div style={{ marginBottom: "1.5rem" }}>
                    <div style={{
                      padding: "1.25rem", borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--background)", border: "1px solid var(--border)",
                      display: "flex", flexDirection: "column", gap: "0.75rem"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>💰 Taxa de entrega</span>
                        <span style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--primary)" }}>
                          R$ {uberQuote.fee.toFixed(2).replace(".", ",")}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>⏱️ Tempo estimado</span>
                        <span style={{ fontSize: "1rem", fontWeight: 600 }}>
                          {uberQuote.estimatedMinutes} min
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button onClick={() => setDispatchOrderId(null)} className="btn-secondary" style={{ flex: 1, padding: "0.75rem" }}>Cancelar</button>
                  {!uberQuote && !uberLoading && (
                    <button onClick={handleUberQuote} className="btn-primary" style={{ flex: 1, padding: "0.75rem", backgroundColor: "#000", color: "#fff" }}>
                      Cotar Entrega
                    </button>
                  )}
                  {uberQuote && (
                    <button
                      onClick={handleUberDispatch}
                      disabled={loadingOrderId === dispatchOrderId}
                      className="btn-primary"
                      style={{ flex: 1, padding: "0.75rem", backgroundColor: "#000", color: "#fff" }}
                    >
                      {loadingOrderId === dispatchOrderId ? "Solicitando..." : "🚗 Solicitar Uber"}
                    </button>
                  )}
                </div>
              </>
            )}
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
    </div>
  );
}
