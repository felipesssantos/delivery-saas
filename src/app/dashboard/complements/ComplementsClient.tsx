"use client";

import { useState } from "react";
import {
  createAddonCategory, updateAddonCategory, deleteAddonCategory,
  createAddonOption, updateAddonOption, deleteAddonOption
} from "../menu/addon-actions";

type AddonOption = {
  id: string;
  name: string;
  price: number;
};

type ProductLink = {
  product: { name: string };
};

type AddonCategory = {
  id: string;
  name: string;
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
  pricingMethod: "SUM" | "AVERAGE" | "HIGHEST";
  options: AddonOption[];
  productLinks: ProductLink[];
};

const PRICING_LABELS: Record<string, string> = {
  SUM: "Soma",
  AVERAGE: "Média",
  HIGHEST: "Maior Valor",
};

export default function ComplementsClient({ initialCategories }: { initialCategories: AddonCategory[] }) {
  const [editingCategory, setEditingCategory] = useState<AddonCategory | Partial<AddonCategory> | null>(null);
  const [editingOption, setEditingOption] = useState<{ categoryId: string; option: AddonOption | Partial<AddonOption> } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSaveCategory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    formData.set("isRequired", formData.get("isRequired") ? "true" : "false");

    try {
      if (editingCategory?.id) {
        await updateAddonCategory(editingCategory.id, formData);
      } else {
        await createAddonCategory(formData);
      }
      setEditingCategory(null);
    } catch (err: any) {
      setError(err.message || "Erro ao salvar");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm("Deseja excluir este grupo e todas as suas opções?")) return;
    setIsSubmitting(true);
    try {
      await deleteAddonCategory(id);
    } catch (err: any) {
      alert(err.message || "Erro ao excluir");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveOption = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingOption) return;
    setIsSubmitting(true);
    setError("");
    const formData = new FormData(e.currentTarget);

    const displayPrice = formData.get("priceDisplay") as string;
    const rawPrice = displayPrice ? displayPrice.replace(/\./g, "").replace(",", ".") : "0";
    formData.set("price", rawPrice);

    try {
      if (editingOption.option.id) {
        await updateAddonOption(editingOption.option.id, formData);
      } else {
        await createAddonOption(editingOption.categoryId, formData);
      }
      setEditingOption(null);
    } catch (err: any) {
      setError(err.message || "Erro ao salvar opção");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOption = async (id: string) => {
    if (!window.confirm("Deseja excluir esta opção?")) return;
    setIsSubmitting(true);
    try {
      await deleteAddonOption(id);
    } catch (err: any) {
      alert(err.message || "Erro ao excluir");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Botão de criar */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={() => setEditingCategory({ name: "", isRequired: false, minSelect: 0, maxSelect: 1, pricingMethod: "SUM" })}
          className="btn-primary"
        >
          + Novo Grupo de Complemento
        </button>
      </div>

      {initialCategories.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Nenhum grupo criado ainda.</p>
          <p style={{ fontSize: "0.85rem", color: "var(--text-tertiary)" }}>
            Crie um grupo como &ldquo;Sabores - Pizza Grande&rdquo; e adicione opções com seus preços.
          </p>
        </div>
      ) : (
        initialCategories.map((cat) => (
          <div key={cat.id} className="card" style={{ overflow: "hidden", padding: 0 }}>
            {/* Category Header */}
            <div
              onClick={() => setExpandedId(expandedId === cat.id ? null : cat.id)}
              style={{
                padding: "1rem 1.5rem",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: expandedId === cat.id ? "var(--background)" : "transparent",
                transition: "background 0.2s",
              }}
            >
              <div>
                <h4 style={{ fontWeight: 600, fontSize: "1.05rem" }}>{cat.name}</h4>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                  Regra: <strong>{PRICING_LABELS[cat.pricingMethod]}</strong> • Min: {cat.minSelect} • Max: {cat.maxSelect}
                  {cat.isRequired && " • Obrigatório"}
                  {" • "}{cat.options.length} {cat.options.length === 1 ? "opção" : "opções"}
                  {cat.productLinks.length > 0 && ` • Usado em: ${cat.productLinks.map(l => l.product.name).join(", ")}`}
                </p>
              </div>
              <span style={{ fontSize: "1.2rem", color: "var(--text-secondary)", transform: expandedId === cat.id ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▼</span>
            </div>

            {/* Expanded Content */}
            {expandedId === cat.id && (
              <div style={{ borderTop: "1px solid var(--border)", padding: "1rem 1.5rem" }}>
                {/* Actions */}
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
                  <button onClick={() => setEditingCategory(cat)} className="btn-secondary" style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}>Editar Grupo</button>
                  <button onClick={() => handleDeleteCategory(cat.id)} style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem", backgroundColor: "var(--error-light)", color: "var(--error)", border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer" }}>Excluir Grupo</button>
                </div>

                {/* Options Table */}
                {cat.options.length === 0 ? (
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontStyle: "italic" }}>Nenhuma opção cadastrada.</p>
                ) : (
                  <table style={{ width: "100%", fontSize: "0.875rem", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid var(--border)" }}>
                        <th style={{ textAlign: "left", padding: "0.5rem 0", fontWeight: 600 }}>Opção</th>
                        <th style={{ textAlign: "left", padding: "0.5rem 0", fontWeight: 600 }}>Preço</th>
                        <th style={{ textAlign: "right", padding: "0.5rem 0", fontWeight: 600 }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cat.options.map((opt) => (
                        <tr key={opt.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                          <td style={{ padding: "0.6rem 0", fontWeight: 500 }}>{opt.name}</td>
                          <td style={{ padding: "0.6rem 0", color: "var(--text-secondary)" }}>
                            {opt.price > 0 ? `R$ ${formatCurrency(opt.price)}` : "Grátis"}
                          </td>
                          <td style={{ padding: "0.6rem 0", textAlign: "right" }}>
                            <button onClick={() => setEditingOption({ categoryId: cat.id, option: opt })} style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", marginRight: "1rem", fontWeight: 500 }}>Editar</button>
                            <button onClick={() => handleDeleteOption(opt.id)} style={{ background: "none", border: "none", color: "var(--error)", cursor: "pointer", fontWeight: 500 }}>Excluir</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                <button
                  onClick={() => setEditingOption({ categoryId: cat.id, option: { name: "", price: 0 } })}
                  style={{ marginTop: "1rem", background: "none", border: "none", color: "var(--primary)", fontWeight: 600, cursor: "pointer", fontSize: "0.85rem" }}
                >
                  + Nova Opção
                </button>
              </div>
            )}
          </div>
        ))
      )}

      {/* ======== MODAL: EDITAR GRUPO ======== */}
      {editingCategory && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem", backdropFilter: "blur(4px)" }}>
          <div style={{ backgroundColor: "var(--surface)", padding: "2rem", borderRadius: "var(--radius-lg)", width: "100%", maxWidth: "500px", boxShadow: "var(--shadow-lg)" }}>
            <h4 style={{ fontSize: "1.15rem", fontWeight: 600, marginBottom: "1.5rem" }}>{editingCategory.id ? "Editar Grupo" : "Novo Grupo de Complemento"}</h4>
            {error && <div style={{ color: "var(--error)", fontSize: "0.85rem", marginBottom: "1rem" }}>{error}</div>}

            <form onSubmit={handleSaveCategory} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <label className="label">Nome do Grupo</label>
                <input type="text" name="name" defaultValue={editingCategory.name} required className="input-field" placeholder="Ex: Sabores - Pizza Grande" />
              </div>

              <div style={{ display: "flex", gap: "1rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flex: 1 }}>
                  <label className="label">Mín. Escolhas</label>
                  <input type="number" name="minSelect" defaultValue={editingCategory.minSelect} min="0" required className="input-field" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flex: 1 }}>
                  <label className="label">Máx. Escolhas</label>
                  <input type="number" name="maxSelect" defaultValue={editingCategory.maxSelect} min="1" required className="input-field" />
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <label className="label">Regra de Cobrança</label>
                <select name="pricingMethod" defaultValue={editingCategory.pricingMethod} className="input-field">
                  <option value="SUM">Soma (Ex: Adicionar Bacon +R$5)</option>
                  <option value="HIGHEST">Maior Valor (Ex: Pizza Meio a Meio)</option>
                  <option value="AVERAGE">Média (Divide pela quantidade)</option>
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input type="checkbox" name="isRequired" id="catRequired" defaultChecked={editingCategory.isRequired} style={{ width: "1.2rem", height: "1.2rem", accentColor: "var(--primary)" }} />
                <label htmlFor="catRequired" style={{ cursor: "pointer", fontWeight: 500 }}>Obrigar o cliente a escolher</label>
              </div>

              <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
                <button type="button" onClick={() => { setEditingCategory(null); setError(""); }} className="btn-secondary" style={{ flex: 1 }}>Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ flex: 1 }}>{isSubmitting ? "Salvando..." : "Salvar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======== MODAL: EDITAR OPÇÃO ======== */}
      {editingOption && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem", backdropFilter: "blur(4px)" }}>
          <div style={{ backgroundColor: "var(--surface)", padding: "2rem", borderRadius: "var(--radius-lg)", width: "100%", maxWidth: "400px", boxShadow: "var(--shadow-lg)" }}>
            <h4 style={{ fontSize: "1.15rem", fontWeight: 600, marginBottom: "1.5rem" }}>{editingOption.option.id ? "Editar Opção" : "Nova Opção"}</h4>
            {error && <div style={{ color: "var(--error)", fontSize: "0.85rem", marginBottom: "1rem" }}>{error}</div>}

            <form onSubmit={handleSaveOption} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <label className="label">Nome da Opção</label>
                <input type="text" name="name" defaultValue={editingOption.option.name} required className="input-field" placeholder="Ex: Calabresa" />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <label className="label">Preço (R$)</label>
                <input
                  type="text"
                  name="priceDisplay"
                  defaultValue={editingOption.option.price ? formatCurrency(editingOption.option.price) : ""}
                  placeholder="0,00"
                  className="input-field"
                  onChange={(e) => {
                    let value = e.target.value.replace(/\D/g, "");
                    if (value === "") { e.target.value = ""; return; }
                    const floatValue = parseInt(value, 10) / 100;
                    e.target.value = formatCurrency(floatValue);
                  }}
                />
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Deixe 0,00 se for grátis.</span>
              </div>

              <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
                <button type="button" onClick={() => { setEditingOption(null); setError(""); }} className="btn-secondary" style={{ flex: 1 }}>Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ flex: 1 }}>{isSubmitting ? "Salvando..." : "Salvar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
