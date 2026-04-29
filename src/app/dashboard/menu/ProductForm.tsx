"use client";

import { useState } from "react";
import { createProduct, updateProduct, deleteProduct } from "./actions";

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  isActive: boolean;
};

export default function ProductForm({ product, categoryId, onClose }: { product: Product | null, categoryId: string, onClose: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  
  // Format initial price if it exists
  const initialPrice = product ? (product.price).toFixed(2).replace('.', ',') : "";
  const [displayPrice, setDisplayPrice] = useState(initialPrice);

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    
    if (value === '') {
      setDisplayPrice('');
      return;
    }

    // Convert to decimal (e.g. 100 -> 1.00)
    const floatValue = parseInt(value, 10) / 100;
    
    // Format to BRL manually to avoid 'R$' prefix in the input (just the numbers)
    const formatted = floatValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    setDisplayPrice(formatted);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    // Convert displayPrice (e.g. "1.234,56") back to float (1234.56)
    const rawPrice = displayPrice.replace(/\./g, '').replace(',', '.');
    formData.set("price", rawPrice);

    formData.append("categoryId", categoryId);
    formData.set("isActive", formData.get("isActive") ? "true" : "false");

    try {
      if (product) {
        await updateProduct(product.id, formData);
      } else {
        await createProduct(formData);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || "Erro ao salvar produto");
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!product) return;
    if (!window.confirm("Tem certeza que deseja excluir este produto?")) return;
    
    setIsSubmitting(true);
    try {
      await deleteProduct(product.id);
      onClose();
    } catch (err: any) {
      setError(err.message || "Erro ao excluir produto");
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0, 
      backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
      padding: "1rem"
    }}>
      <div style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)", width: "100%", maxWidth: "600px", padding: "2rem", position: "relative", maxHeight: "90vh", overflowY: "auto" }}>
        <button onClick={onClose} style={{ position: "absolute", top: "1rem", right: "1rem", background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "var(--text-secondary)" }}>&times;</button>
        
        <h3 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1.5rem" }}>
          {product ? "Editar Produto" : "Novo Produto"}
        </h3>

        {error && (
          <div style={{ padding: "1rem", backgroundColor: "var(--error-light)", color: "var(--error)", borderRadius: "0.5rem", marginBottom: "1rem", fontSize: "0.875rem" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label htmlFor="name" className="label">Nome do Produto</label>
            <input 
              type="text" 
              id="name" 
              name="name" 
              className="input-field" 
              defaultValue={product?.name || ""} 
              placeholder="Ex: X-Bacon Artesanal"
              required 
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label htmlFor="description" className="label">Descrição</label>
            <textarea 
              id="description" 
              name="description" 
              className="input-field" 
              defaultValue={product?.description || ""} 
              placeholder="Ex: Pão brioche, blend 180g, queijo cheddar, muito bacon e molho especial."
              rows={3}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label htmlFor="price" className="label">Preço (R$)</label>
            <input 
              type="text" 
              id="price" 
              name="price" 
              className="input-field" 
              value={displayPrice}
              onChange={handlePriceChange}
              placeholder="0,00"
              required 
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label htmlFor="image" className="label">URL da Imagem</label>
            <input 
              type="url" 
              id="image" 
              name="image" 
              className="input-field" 
              defaultValue={product?.image || ""} 
              placeholder="https://exemplo.com/imagem.jpg"
            />
            <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: "0.25rem" }}>
              Cole o link direto da imagem. (No futuro teremos upload direto de arquivo).
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "0.75rem" }}>
            <input 
              type="checkbox" 
              id="isActive" 
              name="isActive" 
              defaultChecked={product ? product.isActive : true} 
              style={{ width: "1.25rem", height: "1.25rem", accentColor: "var(--primary)" }}
            />
            <label htmlFor="isActive" style={{ fontWeight: 500, cursor: "pointer" }}>Produto Ativo</label>
          </div>

          <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
            <button type="button" onClick={onClose} className="btn-secondary" style={{ flex: 1 }} disabled={isSubmitting}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>

        {product && (
          <div style={{ marginTop: "2rem", paddingTop: "1rem", borderTop: "1px solid var(--border-light)", textAlign: "center" }}>
            <button onClick={handleDelete} disabled={isSubmitting} style={{ color: "var(--error)", background: "none", border: "none", cursor: "pointer", fontSize: "0.875rem", fontWeight: 500 }}>
              Excluir Produto Permanentemente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
