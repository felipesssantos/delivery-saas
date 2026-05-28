"use client";

import { useState, useEffect } from "react";
import { CartItem, DeliveryConfig } from "./StoreClient";
import { createOrder } from "./actions";

type CartModalProps = {
  store: any;
  cart: CartItem[];
  total: number;
  onClose: () => void;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemove: (productId: string) => void;
  onClearCart: () => void;
  deliveryConfig: DeliveryConfig;
};

export default function CartModal({ store, cart, total, onClose, onUpdateQuantity, onRemove, onClearCart, deliveryConfig }: CartModalProps) {
  const [step, setStep] = useState<"CART" | "CHECKOUT" | "SUCCESS">("CART");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  // Address states
  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [cepError, setCepError] = useState("");
  const [isBlocked, setIsBlocked] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState<number | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // Load from localStorage when component mounts
  useEffect(() => {
    const savedProfile = localStorage.getItem(`customer_profile_${store.id}`);
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        if (parsed.name) setCustomerName(parsed.name);
        if (parsed.phone) setCustomerPhone(parsed.phone);
        if (parsed.cep) setCep(parsed.cep);
        if (parsed.street) setStreet(parsed.street);
        if (parsed.number) setNumber(parsed.number);
        if (parsed.complement) setComplement(parsed.complement);
        if (parsed.neighborhood) setNeighborhood(parsed.neighborhood);
        if (parsed.city) setCity(parsed.city);
        if (parsed.state) setState(parsed.state);
      } catch (e) {
        console.error("Failed to parse saved profile", e);
      }
    }
  }, [store.id]);

  const handleAddressFieldChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
    if (store.uberDirectEnabled) {
      setDeliveryFee(null);
      setQuoteError("");
    }
  };

  const [paymentMethod, setPaymentMethod] = useState("PIX");
  const [changeFor, setChangeFor] = useState("");
  const [observation, setObservation] = useState("");

  const grandTotal = total + (deliveryFee || 0);

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 8) value = value.slice(0, 8);

    let formatted = value;
    if (value.length > 5) {
      formatted = `${value.slice(0, 5)}-${value.slice(5)}`;
    }
    setCep(formatted);
    setCepError("");
    setIsBlocked(false);
    if (store.uberDirectEnabled) {
      setDeliveryFee(null);
      setQuoteError("");
    } else {
      setDeliveryFee(null);
    }

    if (value.length === 8) {
      setIsLoadingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${value}/json/`);
        const data = await res.json();
        if (data.erro) {
          setCepError("CEP não encontrado. Verifique e tente novamente.");
        } else {
          setStreet(data.logradouro || "");
          setNeighborhood(data.bairro || "");
          setCity(data.localidade || "");
          setState(data.uf || "");

          validateCity(data.localidade, data.bairro);
        }
      } catch (err) {
        console.error("Erro ao buscar CEP", err);
        setCepError("Erro ao buscar CEP. Tente novamente.");
      } finally {
        setIsLoadingCep(false);
      }
    }
  };

  const calculateUberQuote = async () => {
    if (!street || !number || !city || !state || !cep) {
      setQuoteError("Preencha todos os campos do endereço (incluindo número) para calcular o frete.");
      return;
    }

    setIsQuoting(true);
    setQuoteError("");
    try {
      const res = await fetch("/api/delivery/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: store.id,
          dropoff: { street, number, city, state, cep }
        })
      });
      const data = await res.json();

      if (!res.ok) {
        setQuoteError(data.error || "Erro ao calcular frete. Verifique o endereço.");
      } else {
        setDeliveryFee(data.fee);
      }
    } catch (err) {
      setQuoteError("Falha de conexão. Tente novamente.");
    } finally {
      setIsQuoting(false);
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBlocked) return;
    setIsSubmitting(true);

    try {
      await createOrder({
        storeId: store.id,
        customerName,
        customerPhone,
        cep,
        street,
        number,
        complement,
        neighborhood,
        city,
        state,
        paymentMethod,
        changeFor: paymentMethod === "CASH" ? changeFor : null,
        observation,
        deliveryFee: deliveryFee || 0,
        items: cart.map(item => {
          const flatAddons = Object.values(item.selectedOptions || {}).flat();
          return {
            productId: item.product.id,
            name: item.product.name,
            quantity: item.quantity,
            price: item.finalPrice,
            addons: flatAddons.map(opt => ({
              id: opt.id,
              name: opt.name,
              price: opt.price
            }))
          };
        }),
        subtotal: total,
      });

      setStep("SUCCESS");
      onClearCart();
    } catch (err) {
      console.error("Erro ao criar pedido:", err);
      alert("Erro ao enviar o pedido. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhoneBlur = async () => {
    const cleanPhone = customerPhone.replace(/\D/g, "");
    if (cleanPhone.length < 10) return;

    // Se já temos os dados (carregados via localStorage ou digitados), podemos pular a busca,
    // a menos que estejamos tentando auto-completar especificamente para um número novo.
    // Para melhorar, buscamos sempre que o telefone mudar se o CEP estiver vazio.
    if (cep && street) return;

    setIsLoadingProfile(true);
    try {
      const res = await fetch(`/api/customer/profile?phone=${cleanPhone}&storeId=${store.id}`);
      const data = await res.json();

      if (data.found) {
        if (!customerName) setCustomerName(data.name);

        if (data.address && !cep) {
          setCep(data.address.cep);
          setStreet(data.address.street);
          setNumber(data.address.number);
          setComplement(data.address.complement || "");
          setNeighborhood(data.address.neighborhood);
          setCity(data.address.city);
          setState(data.address.state);

          // Revalida a área de entrega automaticamente
          validateCity(data.address.city, data.address.neighborhood);
        }
      }
    } catch (error) {
      console.error("Erro ao buscar dados do cliente", error);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  // Helper para validar cidade
  const validateCity = (cidade: string, bairro: string) => {
    const cidadeLower = (cidade || "").toLowerCase();
    const bairroLower = (bairro || "").toLowerCase();
    const cityConfig = deliveryConfig.cities.find(c => c.name === cidadeLower);

    if (!cityConfig) {
      setIsBlocked(true);
      setCepError(`Infelizmente não realizamos entregas na cidade de "${cidade}".`);
      return false;
    } else {
      const isBlacklisted = cityConfig.blacklistedNeighborhoods.some(b => b === bairroLower);
      if (isBlacklisted) {
        setIsBlocked(true);
        setCepError(`Infelizmente não realizamos entregas no bairro "${bairro}".`);
        return false;
      }
      setIsBlocked(false);
      setCepError("");
      
      // Define a taxa de entrega base (caso não use Uber Direct)
      if (!store.uberDirectEnabled) {
        setDeliveryFee(deliveryConfig.baseDeliveryFee);
      }
      return true;
    }
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.6)", zIndex: 100,
      display: "flex", flexDirection: "column", justifyContent: "flex-end",
      backdropFilter: "blur(4px)"
    }}>
      <div style={{
        backgroundColor: "var(--surface)",
        width: "100%",
        height: "85vh",
        borderTopLeftRadius: "var(--radius-lg)",
        borderTopRightRadius: "var(--radius-lg)",
        display: "flex", flexDirection: "column",
        animation: "slideUp 0.3s ease-out forwards"
      }}>

        {/* HEADER */}
        <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>
            {step === "CART" && "Sua Sacola"}
            {step === "CHECKOUT" && "Finalizar Pedido"}
            {step === "SUCCESS" && "Pedido Recebido!"}
          </h2>
          <button onClick={onClose} style={{ fontSize: "1.5rem", color: "var(--text-secondary)", background: "none", border: "none", cursor: "pointer" }}>&times;</button>
        </div>

        {/* CONTENT */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>

          {step === "CART" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-secondary)" }}>
                  <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🛒</div>
                  <p>Sua sacola está vazia.</p>
                </div>
              ) : (
                <>
                  {cart.map(item => {
                    const flatAddons = Object.values(item.selectedOptions || {}).flat();
                    return (
                      <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ fontWeight: 600 }}>{item.product.name}</h4>
                          {flatAddons.length > 0 && (
                            <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginBottom: "0.2rem" }}>
                              {flatAddons.map(a => a.name).join(", ")}
                            </p>
                          )}
                          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.finalPrice)}
                          </p>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "1rem", backgroundColor: "var(--background)", borderRadius: "var(--radius-full)", padding: "0.25rem" }}>
                          {item.quantity === 1 ? (
                            <button
                              onClick={() => { if (window.confirm("Deseja realmente remover este item da sacola?")) onRemove(item.id); }}
                              style={{ width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", backgroundColor: "var(--error-light)", color: "var(--error)", fontSize: "1rem", border: "none", cursor: "pointer" }}
                            >🗑️</button>
                          ) : (
                            <button onClick={() => onUpdateQuantity(item.id, -1)} style={{ width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", backgroundColor: "var(--surface)", fontWeight: "bold", border: "none", cursor: "pointer" }}>-</button>
                          )}
                          <span style={{ fontWeight: 600, minWidth: "1rem", textAlign: "center" }}>{item.quantity}</span>
                          <button onClick={() => onUpdateQuantity(item.id, 1)} style={{ width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", backgroundColor: "var(--surface)", fontWeight: "bold", color: "var(--primary)", border: "none", cursor: "pointer" }}>+</button>
                        </div>
                      </div>
                    )
                  })}

                  <div style={{ marginTop: "1rem", paddingTop: "1.5rem", borderTop: "1px dashed var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "1.1rem", color: "var(--text-secondary)" }}>Total</span>
                    <span style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--primary)" }}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          {step === "CHECKOUT" && (
            <form id="checkout-form" onSubmit={handleCheckout} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Seus Dados</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label className="label">WhatsApp</label>
                <div style={{ position: "relative" }}>
                  <input 
                    type="tel" 
                    className="input-field" 
                    required 
                    value={customerPhone} 
                    onChange={e => setCustomerPhone(e.target.value)} 
                    onBlur={handlePhoneBlur}
                    placeholder="(11) 99999-9999" 
                    style={{ width: "100%" }}
                  />
                  {isLoadingProfile && (
                    <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "0.8rem", color: "var(--primary)" }}>
                      Buscando...
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label className="label">Nome Completo</label>
                <input type="text" className="input-field" required value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Ex: João da Silva" />
              </div>

              <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginTop: "1rem" }}>Entrega</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", gridColumn: "1 / -1" }}>
                  <label className="label">CEP</label>
                  <input type="text" className="input-field" required value={cep} onChange={handleCepChange} placeholder="00000-000" style={isBlocked ? { borderColor: "var(--error)" } : {}} />
                  {isLoadingCep && <span style={{ fontSize: "0.8rem", color: "var(--primary)" }}>Buscando endereço...</span>}
                  {cepError && (
                    <div style={{ fontSize: "0.85rem", color: "var(--error)", backgroundColor: "var(--error-light)", padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", fontWeight: 500 }}>
                      ⚠️ {cepError}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", gridColumn: "1 / -1" }}>
                  <label className="label">Rua</label>
                  <input type="text" className="input-field" required value={street} onChange={handleAddressFieldChange(setStreet)} placeholder="Nome da rua" />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label className="label">Número</label>
                  <input id="address-number" type="text" className="input-field" required value={number} onChange={handleAddressFieldChange(setNumber)} placeholder="Ex: 123" />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label className="label">Complemento</label>
                  <input type="text" className="input-field" value={complement} onChange={e => setComplement(e.target.value)} maxLength={50} placeholder="Apto, Casa 2..." />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", gridColumn: "1 / -1" }}>
                  <label className="label">Bairro</label>
                  <input type="text" className="input-field" required value={neighborhood} onChange={handleAddressFieldChange(setNeighborhood)} placeholder="Seu bairro" />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label className="label">Cidade</label>
                  <input type="text" className="input-field" required value={city} onChange={handleAddressFieldChange(setCity)} />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label className="label">Estado (UF)</label>
                  <input type="text" className="input-field" required value={state} onChange={handleAddressFieldChange(setState)} maxLength={2} />
                </div>
              </div>

              {/* UBER QUOTE BUTTON */}
              {store.uberDirectEnabled && !isBlocked && deliveryFee === null && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
                  <button
                    type="button"
                    onClick={calculateUberQuote}
                    disabled={isQuoting || !cep || !street || !number}
                    className="btn-primary"
                    style={{ padding: "0.75rem", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem", opacity: (isQuoting || !cep || !street || !number) ? 0.5 : 1 }}
                  >
                    {isQuoting ? "Calculando..." : "Calcular Valor da Entrega"}
                  </button>
                  {quoteError && <span style={{ color: "var(--error)", fontSize: "0.85rem", textAlign: "center" }}>⚠️ {quoteError}</span>}
                </div>
              )}

              {/* DELIVERY FEE SUMMARY */}
              {deliveryFee !== null && !isBlocked && (
                <div style={{ backgroundColor: "var(--background)", borderRadius: "var(--radius-md)", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Subtotal</span>
                    <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Taxa de entrega</span>
                    <span style={{ color: deliveryFee === 0 ? "var(--success)" : undefined }}>
                      {deliveryFee === 0 ? "Grátis" : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(deliveryFee)}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed var(--border)", paddingTop: "0.5rem", fontWeight: 700 }}>
                    <span>Total</span>
                    <span style={{ color: "var(--primary)", fontSize: "1.1rem" }}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(grandTotal)}
                    </span>
                  </div>
                  {store.uberDirectEnabled && (
                    <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "var(--text-tertiary)", textAlign: "center", fontStyle: "italic" }}>
                      * O valor da entrega pode sofrer alteração devido ao tempo da cotação e até que o pedido fique pronto.
                    </div>
                  )}
                </div>
              )}

              <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginTop: "1rem" }}>Observações</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <label className="label">Algum detalhe adicional para o pedido?</label>
                <textarea className="input-field" value={observation} onChange={e => setObservation(e.target.value)} maxLength={200} placeholder="Ex: Tirar cebola do hambúrguer, maionese à parte, etc." rows={2} />
                <span style={{ fontSize: "0.7rem", color: observation.length >= 180 ? "var(--error)" : "var(--text-tertiary)", textAlign: "right" }}>{observation.length}/200</span>
              </div>

              <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginTop: "1rem" }}>Pagamento</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <select className="input-field" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                  <option value="PIX">PIX (Chave na entrega)</option>
                  <option value="CARD">Cartão (Máquininha)</option>
                  <option value="CASH">Dinheiro</option>
                </select>
              </div>

              {paymentMethod === "CASH" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label className="label">Troco para quanto?</label>
                  <input type="text" className="input-field" value={changeFor} onChange={e => setChangeFor(e.target.value)} placeholder="Ex: 50,00 (ou deixe em branco se não precisar)" />
                </div>
              )}
            </form>
          )}

          {step === "SUCCESS" && (
            <div style={{ textAlign: "center", padding: "3rem 1rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
              <div style={{ width: "80px", height: "80px", borderRadius: "50%", backgroundColor: "var(--success-bg)", color: "var(--success)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3rem", marginBottom: "1rem" }}>✓</div>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Tudo certo!</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "1.1rem" }}>
                Seu pedido foi enviado para o WhatsApp da loja. Em breve você receberá a confirmação por lá!
              </p>
            </div>
          )}
        </div>

        {/* FOOTER ACTIONS */}
        {step !== "SUCCESS" && (
          <div style={{ padding: "1.5rem", borderTop: "1px solid var(--border)", display: "flex", gap: "1rem" }}>
            {step === "CHECKOUT" && (
              <button onClick={() => setStep("CART")} className="btn-secondary" style={{ flex: 1 }} disabled={isSubmitting}>Voltar</button>
            )}

            {step === "CART" ? (
              <button onClick={() => setStep("CHECKOUT")} className="btn-primary" style={{ flex: 1, padding: "1rem", opacity: cart.length === 0 ? 0.5 : 1 }} disabled={cart.length === 0}>
                Continuar
              </button>
            ) : (
              <button type="submit" form="checkout-form" className="btn-primary" style={{ flex: 2, padding: "1rem", opacity: (isBlocked || (store.uberDirectEnabled && deliveryFee === null)) ? 0.5 : 1 }} disabled={isSubmitting || isBlocked || (store.uberDirectEnabled && deliveryFee === null)}>
                {isSubmitting ? "Enviando..." : isBlocked ? "Entrega indisponível" : (store.uberDirectEnabled && deliveryFee === null) ? "Calcule a entrega primeiro" : "Confirmar Pedido"}
              </button>
            )}
          </div>
        )}

        {step === "SUCCESS" && (
          <div style={{ padding: "1.5rem" }}>
            <button onClick={onClose} className="btn-primary" style={{ width: "100%", padding: "1rem" }}>Fechar Catálogo</button>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}} />
    </div>
  );
}
