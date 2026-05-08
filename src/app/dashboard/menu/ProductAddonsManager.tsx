"use client";

import { useState } from "react";
import { linkAddonToProduct, unlinkAddonFromProduct } from "./addon-actions";

type AddonOption = {
  id: string;
  name: string;
  price: number;
};

type AddonCategory = {
  id: string;
  name: string;
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
  pricingMethod: "SUM" | "AVERAGE" | "HIGHEST";
  options: AddonOption[];
};

type ProductWithAddons = {
  id: string;
  name: string;
  addonLinks: { addonCategoryId: string; addonCategory: AddonCategory }[];
};

const PRICING_LABELS: Record<string, string> = {
  SUM: "Soma",
  AVERAGE: "Média",
  HIGHEST: "Maior Valor",
};

export default function ProductAddonsManager({
  product,
  allAddonCategories,
  onClose,
}: {
  product: ProductWithAddons;
  allAddonCategories: AddonCategory[];
  onClose: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const linkedIds = new Set(product.addonLinks.map((l) => l.addonCategoryId));

  const handleToggle = async (categoryId: string) => {
    setIsSubmitting(true);
    try {
      if (linkedIds.has(categoryId)) {
        await unlinkAddonFromProduct(product.id, categoryId);
      } else {
        await linkAddonToProduct(product.id, categoryId);
      }
    } catch (err: any) {
      alert(err.message || "Erro ao atualizar vínculo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, padding: "1rem", backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
          width: "100%", maxWidth: "700px",
          padding: "2rem", position: "relative",
          maxHeight: "90vh", display: "flex", flexDirection: "column",
        }}
      >
        <button
          onClick={onClose}
          style={{ position: "absolute", top: "1rem", right: "1rem", background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "var(--text-secondary)" }}
        >
          &times;
        </button>

        <div style={{ marginBottom: "1.5rem" }}>
          <h3 style={{ fontSize: "1.25rem", fontWeight: 600 }}>
            Vincular Complementos: {product.name}
          </h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            Marque os grupos que este produto deve oferecer ao cliente. Gerencie os grupos na aba{" "}
            <strong>Complementos</strong>.
          </p>
        </div>

        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.75rem", paddingRight: "0.5rem" }}>
          {allAddonCategories.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 1rem", border: "1px dashed var(--border)", borderRadius: "var(--radius-md)", color: "var(--text-secondary)" }}>
              Nenhum grupo de complemento cadastrado. Acesse a aba <strong>Complementos</strong> no menu lateral para criar.
            </div>
          ) : (
            allAddonCategories.map((cat) => {
              const isLinked = linkedIds.has(cat.id);
              return (
                <label
                  key={cat.id}
                  style={{
                    display: "flex",
                    gap: "1rem",
                    padding: "1rem",
                    borderRadius: "var(--radius-md)",
                    border: isLinked ? "2px solid var(--primary)" : "1px solid var(--border)",
                    backgroundColor: isLinked ? "var(--primary-light)" : "var(--background)",
                    cursor: isSubmitting ? "wait" : "pointer",
                    transition: "all 0.15s",
                    opacity: isSubmitting ? 0.7 : 1,
                    alignItems: "flex-start",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isLinked}
                    onChange={() => handleToggle(cat.id)}
                    disabled={isSubmitting}
                    style={{ width: "1.3rem", height: "1.3rem", accentColor: "var(--primary)", marginTop: "0.15rem", flexShrink: 0 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: "1rem" }}>{cat.name}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                      Regra: {PRICING_LABELS[cat.pricingMethod]} • Min: {cat.minSelect} • Max: {cat.maxSelect}
                      {cat.isRequired && " • Obrigatório"}
                    </div>
                    {cat.options.length > 0 && (
                      <div style={{ fontSize: "0.8rem", color: "var(--text-tertiary)", marginTop: "0.25rem" }}>
                        {cat.options.slice(0, 5).map((o) => `${o.name} (R$ ${formatCurrency(o.price)})`).join(", ")}
                        {cat.options.length > 5 && ` +${cat.options.length - 5} mais`}
                      </div>
                    )}
                  </div>
                </label>
              );
            })
          )}
        </div>

        <div style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} className="btn-secondary">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
