"use client";

import { useState, useMemo } from "react";
import { Product, AddonCategory, AddonOption } from "./StoreClient";

type Props = {
  product: Product;
  onClose: () => void;
  onAddToCart: (product: Product, selectedOptions: Record<string, AddonOption[]>, finalPrice: number, quantity: number) => void;
};

export default function ProductAddonModal({ product, onClose, onAddToCart }: Props) {
  const [selected, setSelected] = useState<Record<string, AddonOption[]>>({});
  const [quantity, setQuantity] = useState(1);

  const handleSelect = (category: AddonCategory, option: AddonOption) => {
    setSelected((prev) => {
      const catSelected = prev[category.id] || [];
      const isSelected = catSelected.find((o) => o.id === option.id);

      let nextSelected;
      if (isSelected) {
        nextSelected = catSelected.filter((o) => o.id !== option.id);
      } else {
        if (catSelected.length >= category.maxSelect) {
          if (category.maxSelect === 1) {
            nextSelected = [option];
          } else {
            return prev;
          }
        } else {
          nextSelected = [...catSelected, option];
        }
      }
      return { ...prev, [category.id]: nextSelected };
    });
  };

  const finalPrice = useMemo(() => {
    let price = product.price;

    product.addons.forEach((cat) => {
      const catSelected = selected[cat.id] || [];
      if (catSelected.length === 0) return;

      if (cat.pricingMethod === "HIGHEST") {
        const highest = Math.max(...catSelected.map((o) => o.price));
        price += highest;
      } else if (cat.pricingMethod === "AVERAGE") {
        const sum = catSelected.reduce((acc, o) => acc + o.price, 0);
        price += sum / catSelected.length;
      } else {
        // SUM
        const sum = catSelected.reduce((acc, o) => acc + o.price, 0);
        price += sum;
      }
    });

    return price;
  }, [product, selected]);

  const isValid = useMemo(() => {
    return product.addons.every((cat) => {
      const catSelected = selected[cat.id] || [];
      if (cat.isRequired && catSelected.length < cat.minSelect) return false;
      return true;
    });
  }, [product, selected]);

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.6)", zIndex: 110,
      display: "flex", flexDirection: "column", justifyContent: "flex-end",
      backdropFilter: "blur(4px)"
    }}>
      <div style={{
        backgroundColor: "var(--surface)",
        width: "100%",
        maxHeight: "90vh",
        borderTopLeftRadius: "var(--radius-lg)",
        borderTopRightRadius: "var(--radius-lg)",
        display: "flex", flexDirection: "column",
        animation: "slideUp 0.3s ease-out forwards"
      }}>
        
        {/* HEADER */}
        <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>{product.name}</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.25rem" }}>
              {product.description}
            </p>
          </div>
          <button onClick={onClose} style={{ fontSize: "1.5rem", color: "var(--text-secondary)", background: "none", border: "none", cursor: "pointer" }}>&times;</button>
        </div>

        {/* CONTENT */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {product.addons.map((cat) => {
            const catSelected = selected[cat.id] || [];
            const isFulfilled = !cat.isRequired || catSelected.length >= cat.minSelect;

            return (
              <div key={cat.id} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 600 }}>{cat.name}</h3>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      {cat.minSelect > 0 && `Escolha de ${cat.minSelect} até ${cat.maxSelect} opções`}
                      {cat.minSelect === 0 && `Escolha até ${cat.maxSelect} opções`}
                    </p>
                  </div>
                  {cat.isRequired && !isFulfilled && (
                    <span style={{ fontSize: "0.75rem", backgroundColor: "var(--error-light)", color: "var(--error)", padding: "0.2rem 0.5rem", borderRadius: "var(--radius-full)", fontWeight: 600 }}>
                      Obrigatório
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {cat.options.map((option) => {
                    const isSelected = catSelected.find((o) => o.id === option.id);
                    const isDisabled = !isSelected && catSelected.length >= cat.maxSelect && cat.maxSelect > 1;

                    return (
                      <label key={option.id} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "0.75rem", border: `1px solid ${isSelected ? "var(--primary)" : "var(--border)"}`,
                        borderRadius: "var(--radius-md)", cursor: isDisabled ? "not-allowed" : "pointer",
                        backgroundColor: isSelected ? "var(--primary-light)" : "var(--surface)",
                        opacity: isDisabled ? 0.6 : 1
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <input
                            type={cat.maxSelect === 1 ? "radio" : "checkbox"}
                            checked={!!isSelected}
                            disabled={isDisabled}
                            onChange={() => handleSelect(cat, option)}
                            style={{ accentColor: "var(--primary)", width: "1.2rem", height: "1.2rem" }}
                          />
                          <span style={{ fontWeight: 500 }}>{option.name}</span>
                        </div>
                        {option.price > 0 && (
                          <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                            + {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(option.price)}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* FOOTER ACTIONS */}
        <div style={{ padding: "1.5rem", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "1rem", backgroundColor: "var(--surface)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", border: "1px solid var(--border)", borderRadius: "var(--radius-full)", padding: "0.25rem" }}>
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} style={{ width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", backgroundColor: "transparent", fontWeight: "bold", fontSize: "1.2rem", border: "none", cursor: "pointer" }}>-</button>
              <span style={{ fontWeight: 600, minWidth: "1rem", textAlign: "center", fontSize: "1.1rem" }}>{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)} style={{ width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", backgroundColor: "transparent", fontWeight: "bold", color: "var(--primary)", fontSize: "1.2rem", border: "none", cursor: "pointer" }}>+</button>
            </div>
            
            <button
              onClick={() => onAddToCart(product, selected, finalPrice, quantity)}
              disabled={!isValid}
              className="btn-primary"
              style={{ padding: "1rem 2rem", opacity: !isValid ? 0.5 : 1, minWidth: "200px" }}
            >
              Adicionar • {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(finalPrice * quantity)}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
