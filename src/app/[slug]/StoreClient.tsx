"use client";

import { useState, useEffect, useRef } from "react";
import CartModal from "./CartModal";

import ProductAddonModal from "./ProductAddonModal";

export type AddonOption = {
  id: string;
  name: string;
  price: number;
};

export type AddonCategory = {
  id: string;
  name: string;
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
  pricingMethod: "SUM" | "AVERAGE" | "HIGHEST";
  options: AddonOption[];
};

export type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  addons: AddonCategory[];
};

type Category = {
  id: string;
  name: string;
  products: Product[];
};

export type CartItem = {
  id: string; // Unique id for cart entry
  product: Product;
  quantity: number;
  selectedOptions: Record<string, AddonOption[]>;
  finalPrice: number;
};

export type DeliveryConfig = {
  baseDeliveryFee: number;
  cities: { name: string; blacklistedNeighborhoods: string[] }[];
};

type OrderHistory = {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  items: { quantity: number; product: { name: string } }[];
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pendente", color: "#f59e0b" },
  ACCEPTED: { label: "Aceito", color: "#3b82f6" },
  PREPARING: { label: "Preparando", color: "#8b5cf6" },
  READY: { label: "Pronto", color: "#06b6d4" },
  DISPATCHED: { label: "A Caminho", color: "#10b981" },
  DELIVERED: { label: "Entregue", color: "#22c55e" },
  CANCELED: { label: "Cancelado", color: "#ef4444" },
};

const currencyFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export default function StoreClient({ store, categories, deliveryConfig }: { store: any, categories: Category[], deliveryConfig: DeliveryConfig }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Collapsible categories
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  
  // Active category tab (scrollspy)
  const [activeCategoryId, setActiveCategoryId] = useState<string>("");
  const categoryRefs = useRef<Record<string, HTMLElement | null>>({});
  const navRef = useRef<HTMLDivElement>(null);

  // Order history
  const [showOrders, setShowOrders] = useState(false);
  const [trackingPhone, setTrackingPhone] = useState("");
  const [orderHistory, setOrderHistory] = useState<OrderHistory[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // Load saved phone from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`delivery_phone_${store.id}`);
    if (saved) setTrackingPhone(saved);
  }, [store.id]);

  // Scroll spy for category nav
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setActiveCategoryId(entry.target.id);
          }
        });
      },
      { rootMargin: "-100px 0px -60% 0px", threshold: 0.1 }
    );

    Object.values(categoryRefs.current).forEach(ref => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [categories]);

  const toggleCategory = (catId: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  const scrollToCategory = (catId: string) => {
    const el = categoryRefs.current[catId];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      // Ensure it's expanded
      setCollapsedCategories(prev => {
        const next = new Set(prev);
        next.delete(catId);
        return next;
      });
    }
  };

  const handleAddToCart = (product: Product, selectedOptions: Record<string, AddonOption[]> = {}, finalPrice: number, quantity: number = 1) => {
    setCart(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substring(7),
        product,
        quantity,
        selectedOptions,
        finalPrice
      }
    ]);
    setSelectedProduct(null); // Close modal if open
  };

  const handleUpdateQuantity = (cartItemId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === cartItemId) {
        return { ...item, quantity: item.quantity + delta };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const handleRemoveFromCart = (cartItemId: string) => {
    setCart(prev => prev.filter(item => item.id !== cartItemId));
  };

  const fetchOrders = async () => {
    const phone = trackingPhone.replace(/\D/g, "");
    if (phone.length < 10) return alert("Digite um número de WhatsApp válido.");
    
    localStorage.setItem(`delivery_phone_${store.id}`, trackingPhone);
    setIsLoadingOrders(true);
    try {
      const res = await fetch(`/api/orders/by-phone?phone=${phone}&storeId=${store.id}`);
      const data = await res.json();
      setOrderHistory(data.orders || []);
    } catch {
      alert("Erro ao buscar pedidos.");
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const cartTotal = cart.reduce((total, item) => total + (item.finalPrice * item.quantity), 0);
  const cartItemsCount = cart.reduce((count, item) => count + item.quantity, 0);

  // Filter products by search
  const filteredCategories = searchTerm.trim()
    ? categories.map(c => ({
        ...c,
        products: c.products.filter(p => 
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
        )
      })).filter(c => c.products.length > 0)
    : categories;

  return (
    <div>
      {/* SEARCH + MY ORDERS */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", alignItems: "center" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <input 
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="🔍 Buscar no cardápio..."
            style={{
              width: "100%", padding: "0.75rem 1rem", borderRadius: "2rem",
              border: "1px solid var(--border)", backgroundColor: "var(--surface)",
              fontSize: "0.9rem", outline: "none"
            }}
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm("")}
              style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "1.1rem" }}
            >&times;</button>
          )}
        </div>
        <button
          onClick={() => setShowOrders(!showOrders)}
          style={{
            padding: "0.75rem 1rem", borderRadius: "2rem",
            border: "1px solid var(--border)", backgroundColor: showOrders ? "var(--primary)" : "var(--surface)",
            color: showOrders ? "white" : "var(--text-primary)",
            fontSize: "0.85rem", fontWeight: 600, cursor: "pointer",
            whiteSpace: "nowrap", transition: "all 0.2s"
          }}
        >
          📋 Meus Pedidos
        </button>
      </div>

      {/* ORDER HISTORY PANEL */}
      {showOrders && (
        <div style={{ 
          backgroundColor: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)", padding: "1.25rem", marginBottom: "1.5rem",
          animation: "fadeIn 0.2s ease-out"
        }}>
          <h3 style={{ fontWeight: 700, marginBottom: "1rem", fontSize: "1.1rem" }}>📋 Acompanhar Pedidos</h3>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
            <input 
              type="tel"
              value={trackingPhone}
              onChange={e => setTrackingPhone(e.target.value)}
              placeholder="Seu WhatsApp: (71) 99999-9999"
              style={{ flex: 1, padding: "0.65rem 1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", fontSize: "0.9rem" }}
            />
            <button 
              onClick={fetchOrders}
              disabled={isLoadingOrders}
              className="btn-primary"
              style={{ padding: "0.65rem 1.25rem", borderRadius: "var(--radius-md)", fontSize: "0.85rem" }}
            >
              {isLoadingOrders ? "..." : "Buscar"}
            </button>
          </div>

          {orderHistory.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "300px", overflowY: "auto" }}>
              {orderHistory.map(order => {
                const st = STATUS_LABELS[order.status] || { label: order.status, color: "#888" };
                return (
                  <div key={order.id} style={{ padding: "0.75rem", backgroundColor: "var(--background)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                      <span style={{ fontWeight: 700, fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                        #{order.id.slice(-6).toUpperCase()}
                      </span>
                      <span style={{ fontSize: "0.75rem", backgroundColor: `${st.color}20`, color: st.color, padding: "0.15rem 0.5rem", borderRadius: "2rem", fontWeight: 600 }}>
                        {st.label}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                      {order.items.map(i => `${i.quantity}x ${i.product.name}`).join(", ")}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                        {new Date(order.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span style={{ fontWeight: 700, color: "var(--primary)", fontSize: "0.9rem" }}>
                        {currencyFmt.format(order.totalAmount)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : orderHistory !== null && trackingPhone && (
            <p style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: "0.85rem", padding: "1rem 0" }}>
              Nenhum pedido encontrado para este número.
            </p>
          )}
        </div>
      )}

      {/* CATEGORY NAV TABS (sticky) */}
      {!searchTerm && filteredCategories.length > 1 && (
        <div ref={navRef} style={{
          position: "sticky", top: 0, zIndex: 50,
          backgroundColor: "var(--background)",
          borderBottom: "1px solid var(--border)",
          marginBottom: "1.5rem", marginLeft: "-1rem", marginRight: "-1rem",
          padding: "0 1rem",
          overflowX: "auto",
          display: "flex", gap: "0",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none"
        }}>
          {filteredCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => scrollToCategory(`cat-${cat.id}`)}
              style={{
                padding: "0.75rem 1rem",
                border: "none",
                borderBottom: activeCategoryId === `cat-${cat.id}` ? "2px solid var(--primary)" : "2px solid transparent",
                backgroundColor: "transparent",
                color: activeCategoryId === `cat-${cat.id}` ? "var(--primary)" : "var(--text-secondary)",
                fontWeight: activeCategoryId === `cat-${cat.id}` ? 700 : 500,
                fontSize: "0.85rem",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.2s"
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* CATEGORIES + PRODUCTS */}
      {filteredCategories.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem 0", color: "var(--text-secondary)" }}>
          {searchTerm ? `Nenhum resultado para "${searchTerm}"` : "Nenhum produto disponível no momento."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {filteredCategories.map(category => {
            const isCollapsed = collapsedCategories.has(category.id);
            return (
              <div
                key={category.id}
                id={`cat-${category.id}`}
                ref={el => { categoryRefs.current[`cat-${category.id}`] = el; }}
                style={{ scrollMarginTop: "60px" }}
              >
                {/* Category Header (clickable) */}
                <button
                  onClick={() => toggleCategory(category.id)}
                  style={{
                    width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "0.75rem 0", border: "none", backgroundColor: "transparent", cursor: "pointer",
                    borderBottom: "2px solid var(--primary-light)"
                  }}
                >
                  <span style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--primary)" }}>
                    {category.name}
                    <span style={{ fontSize: "0.8rem", fontWeight: 400, color: "var(--text-secondary)", marginLeft: "0.5rem" }}>
                      ({category.products.length})
                    </span>
                  </span>
                  <span style={{ color: "var(--text-secondary)", fontSize: "1.2rem", transition: "transform 0.2s", transform: isCollapsed ? "rotate(-90deg)" : "rotate(0)" }}>
                    ▾
                  </span>
                </button>

                {/* Products (collapsible) */}
                {!isCollapsed && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "0.75rem" }}>
                    {category.products.map(product => {
                      const cartItemsOfProduct = cart.filter(item => item.product.id === product.id);
                      const totalQty = cartItemsOfProduct.reduce((sum, item) => sum + item.quantity, 0);
                      const hasAddons = product.addons && product.addons.length > 0;

                      return (
                        <div key={product.id} style={{
                          display: "flex", gap: "1rem", padding: "0.85rem", alignItems: "center",
                          backgroundColor: "var(--surface)", borderRadius: "var(--radius-md)",
                          border: "1px solid var(--border)", transition: "box-shadow 0.2s"
                        }}>
                          {/* Product Info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h3 style={{ fontWeight: 600, fontSize: "1rem", marginBottom: "0.2rem" }}>{product.name}</h3>
                            {product.description && (
                              <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginBottom: "0.4rem", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                {product.description}
                              </p>
                            )}
                            <p style={{ fontWeight: 700, color: "var(--primary)", fontSize: "0.95rem" }}>
                              {currencyFmt.format(product.price)}
                            </p>
                          </div>

                          {/* Product Image */}
                          {product.image && (
                            <div style={{ width: "80px", height: "80px", borderRadius: "var(--radius-md)", overflow: "hidden", flexShrink: 0 }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={product.image} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            </div>
                          )}

                          {/* Add/Quantity Controls */}
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative" }}>
                            {(!hasAddons && cartItemsOfProduct.length > 0) ? (
                              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", backgroundColor: "var(--background)", borderRadius: "2rem", padding: "0.2rem 0.4rem", border: "1px solid var(--border)" }}>
                                <button
                                  onClick={() => handleUpdateQuantity(cartItemsOfProduct[0].id, -1)}
                                  style={{ width: "26px", height: "26px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", backgroundColor: "var(--surface)", fontWeight: "bold", fontSize: "1.1rem", color: "var(--text-secondary)", border: "none", cursor: "pointer" }}
                                >-</button>
                                <span style={{ fontWeight: 600, minWidth: "1rem", textAlign: "center", fontSize: "0.9rem" }}>{cartItemsOfProduct[0].quantity}</span>
                                <button
                                  onClick={() => handleUpdateQuantity(cartItemsOfProduct[0].id, 1)}
                                  style={{ width: "26px", height: "26px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", backgroundColor: "var(--surface)", fontWeight: "bold", fontSize: "1.1rem", color: "var(--primary)", border: "none", cursor: "pointer" }}
                                >+</button>
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    if (!store.openStatus) return alert("A loja está fechada no momento.");
                                    if (hasAddons) {
                                      setSelectedProduct(product);
                                    } else {
                                      handleAddToCart(product, {}, product.price, 1);
                                    }
                                  }}
                                  style={{
                                    padding: "0.5rem", borderRadius: "50%", width: "36px", height: "36px",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    backgroundColor: "var(--primary)", color: "white", border: "none",
                                    fontSize: "1.2rem", cursor: "pointer", opacity: store.openStatus ? 1 : 0.5,
                                    boxShadow: "0 2px 8px rgba(240,90,40,0.3)", transition: "transform 0.15s"
                                  }}
                                >+</button>
                                {totalQty > 0 && hasAddons && (
                                  <span style={{
                                    position: "absolute", top: "-5px", right: "-5px",
                                    backgroundColor: "var(--text-primary)", color: "var(--surface)",
                                    fontSize: "0.7rem", fontWeight: "bold", width: "18px", height: "18px",
                                    borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                                    pointerEvents: "none"
                                  }}>
                                    {totalQty}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* FLOATING CART BUTTON */}
      {cartItemsCount > 0 && (
        <div style={{ position: "fixed", bottom: "2rem", left: "50%", transform: "translateX(-50%)", zIndex: 90, width: "100%", maxWidth: "400px", padding: "0 1rem" }}>
          <button
            onClick={() => setIsCartOpen(true)}
            style={{
              width: "100%", backgroundColor: "var(--primary)", color: "white", border: "none",
              borderRadius: "2rem", padding: "1rem 1.5rem",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              boxShadow: "0 10px 25px rgba(240, 90, 40, 0.4)",
              fontWeight: 600, cursor: "pointer", transition: "transform 0.2s"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ backgroundColor: "rgba(255,255,255,0.2)", width: "24px", height: "24px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.875rem" }}>
                {cartItemsCount}
              </span>
              <span>Ver Sacola</span>
            </div>
            <span>{currencyFmt.format(cartTotal)}</span>
          </button>
        </div>
      )}

      {/* CART MODAL */}
      {isCartOpen && (
        <CartModal
          store={store}
          cart={cart}
          total={cartTotal}
          onClose={() => setIsCartOpen(false)}
          onUpdateQuantity={handleUpdateQuantity}
          onRemove={handleRemoveFromCart}
          onClearCart={() => setCart([])}
          deliveryConfig={deliveryConfig}
        />
      )}

      {/* PRODUCT ADDON MODAL */}
      {selectedProduct && (
        <ProductAddonModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={handleAddToCart}
        />
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        div::-webkit-scrollbar { display: none; }
      `}} />
    </div>
  );
}
