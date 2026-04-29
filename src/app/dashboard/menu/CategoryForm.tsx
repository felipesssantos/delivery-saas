"use client";

import { useState } from "react";
import { createCategory, updateCategory, deleteCategory } from "./actions";

type Category = {
  id: string;
  name: string;
  isActive: boolean;
};

export default function CategoryForm({ category, onClose }: { category: Category | null, onClose: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    formData.set("isActive", formData.get("isActive") ? "true" : "false");

    try {
      if (category) {
        await updateCategory(category.id, formData);
      } else {
        await createCategory(formData);
      }
      onClose(); // Will close and the page will refresh from Server Actions revalidatePath
    } catch (err: any) {
      setError(err.message || "Erro ao salvar categoria");
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!category) return;
    if (!window.confirm("Tem certeza que deseja excluir esta categoria? TODOS os produtos dentro dela também serão excluídos!")) return;
    
    setIsSubmitting(true);
    try {
      await deleteCategory(category.id);
      onClose();
    } catch (err: any) {
      setError(err.message || "Erro ao excluir categoria");
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0, 
      backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
      padding: "1rem"
    }}>
      <div style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)", width: "100%", maxWidth: "500px", padding: "2rem", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: "1rem", right: "1rem", background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "var(--text-secondary)" }}>&times;</button>
        
        <h3 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1.5rem" }}>
          {category ? "Editar Categoria" : "Nova Categoria"}
        </h3>

        {error && (
          <div style={{ padding: "1rem", backgroundColor: "var(--error-light)", color: "var(--error)", borderRadius: "0.5rem", marginBottom: "1rem", fontSize: "0.875rem" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label htmlFor="name" className="label">Nome da Categoria</label>
            <input 
              type="text" 
              id="name" 
              name="name" 
              className="input-field" 
              defaultValue={category?.name || ""} 
              placeholder="Ex: Hambúrgueres, Bebidas, Sobremesas"
              required 
            />
          </div>

          <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "0.75rem" }}>
            <input 
              type="checkbox" 
              id="isActive" 
              name="isActive" 
              defaultChecked={category ? category.isActive : true} 
              style={{ width: "1.25rem", height: "1.25rem", accentColor: "var(--primary)" }}
            />
            <label htmlFor="isActive" style={{ fontWeight: 500, cursor: "pointer" }}>Categoria Ativa</label>
          </div>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "-0.75rem" }}>
            Se inativo, a categoria e seus produtos não aparecerão no cardápio público.
          </p>

          <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
            <button type="button" onClick={onClose} className="btn-secondary" style={{ flex: 1 }} disabled={isSubmitting}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>

        {category && (
          <div style={{ marginTop: "2rem", paddingTop: "1rem", borderTop: "1px solid var(--border-light)", textAlign: "center" }}>
            <button onClick={handleDelete} disabled={isSubmitting} style={{ color: "var(--error)", background: "none", border: "none", cursor: "pointer", fontSize: "0.875rem", fontWeight: 500 }}>
              Excluir Categoria Permanentemente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
