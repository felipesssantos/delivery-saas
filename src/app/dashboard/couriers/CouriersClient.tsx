"use client";

import { useState } from "react";
import { createCourier, updateCourier, deleteCourier } from "./actions";

type Courier = {
  id: string;
  name: string;
  phone: string;
  plate: string | null;
  isActive: boolean;
};

export default function CouriersClient({ couriers }: { couriers: Courier[] }) {
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newPlate, setNewPlate] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPlate, setEditPlate] = useState("");

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) return;
    setIsAdding(true);
    try {
      await createCourier(newName, newPhone, newPlate);
      setNewName("");
      setNewPhone("");
      setNewPlate("");
    } catch {
      alert("Erro ao cadastrar entregador.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggle = async (courier: Courier) => {
    try {
      await updateCourier(courier.id, courier.name, courier.phone, courier.plate || "", !courier.isActive);
    } catch {
      alert("Erro ao atualizar.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover este entregador?")) return;
    try {
      await deleteCourier(id);
    } catch {
      alert("Erro ao remover.");
    }
  };

  const handleSaveEdit = async (id: string) => {
    try {
      const courier = couriers.find(c => c.id === id);
      await updateCourier(id, editName, editPhone, editPlate, courier?.isActive ?? true);
      setEditingId(null);
    } catch {
      alert("Erro ao salvar.");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      
      {/* ADD FORM */}
      <div style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.5rem" }}>
        <h3 style={{ fontWeight: 600, marginBottom: "1rem" }}>Cadastrar Entregador</h3>
        <form onSubmit={handleAdd} style={{ display: "flex", gap: "1rem", alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 180px" }}>
            <label className="label">Nome</label>
            <input type="text" className="input-field" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: João" required />
          </div>
          <div style={{ flex: "1 1 180px" }}>
            <label className="label">WhatsApp</label>
            <input type="tel" className="input-field" value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="(71) 99999-9999" required />
          </div>
          <div style={{ flex: "0 1 140px" }}>
            <label className="label">Placa</label>
            <input type="text" className="input-field" value={newPlate} onChange={e => setNewPlate(e.target.value.toUpperCase())} placeholder="ABC-1234" maxLength={8} style={{ textTransform: "uppercase" }} />
          </div>
          <button type="submit" disabled={isAdding} className="btn-primary" style={{ height: "42px", padding: "0 1.5rem" }}>
            {isAdding ? "..." : "Cadastrar"}
          </button>
        </form>
      </div>

      {/* LIST */}
      {couriers.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", backgroundColor: "var(--surface)", border: "1px dashed var(--border)", borderRadius: "var(--radius-lg)", color: "var(--text-secondary)" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🏍️</div>
          Nenhum entregador cadastrado.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {couriers.map(courier => (
            <div key={courier.id} style={{ 
              backgroundColor: "var(--surface)", border: "1px solid var(--border)", 
              borderRadius: "var(--radius-md)", padding: "1rem 1.25rem",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              opacity: courier.isActive ? 1 : 0.6, gap: "1rem"
            }}>
              {editingId === courier.id ? (
                <div style={{ display: "flex", gap: "0.75rem", flex: 1, alignItems: "center", flexWrap: "wrap" }}>
                  <input type="text" className="input-field" value={editName} onChange={e => setEditName(e.target.value)} style={{ flex: "1 1 150px" }} />
                  <input type="tel" className="input-field" value={editPhone} onChange={e => setEditPhone(e.target.value)} style={{ flex: "1 1 150px" }} />
                  <input type="text" className="input-field" value={editPlate} onChange={e => setEditPlate(e.target.value.toUpperCase())} placeholder="Placa" maxLength={8} style={{ flex: "0 1 120px", textTransform: "uppercase" }} />
                  <button onClick={() => handleSaveEdit(courier.id)} className="btn-primary" style={{ padding: "0.4rem 1rem", fontSize: "0.85rem" }}>Salvar</button>
                  <button onClick={() => setEditingId(null)} className="btn-secondary" style={{ padding: "0.4rem 1rem", fontSize: "0.85rem" }}>Cancelar</button>
                </div>
              ) : (
                <>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                      🏍️ {courier.name}
                      {courier.plate && (
                        <span style={{ fontSize: "0.75rem", backgroundColor: "var(--background)", border: "1px solid var(--border)", padding: "0.15rem 0.5rem", borderRadius: "var(--radius-sm)", fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.05em" }}>
                          {courier.plate}
                        </span>
                      )}
                      {!courier.isActive && (
                        <span style={{ fontSize: "0.7rem", backgroundColor: "var(--error-light)", color: "var(--error)", padding: "0.1rem 0.4rem", borderRadius: "2rem" }}>Inativo</span>
                      )}
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                      📱 {courier.phone}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button 
                      onClick={() => { setEditingId(courier.id); setEditName(courier.name); setEditPhone(courier.phone); setEditPlate(courier.plate || ""); }}
                      style={{ padding: "0.4rem 0.75rem", borderRadius: "var(--radius-md)", backgroundColor: "var(--background)", border: "1px solid var(--border)", cursor: "pointer", fontSize: "0.8rem" }}
                    >✏️</button>
                    <button 
                      onClick={() => handleToggle(courier)}
                      style={{ padding: "0.4rem 0.75rem", borderRadius: "var(--radius-md)", backgroundColor: courier.isActive ? "var(--background)" : "var(--success-bg)", border: "1px solid var(--border)", cursor: "pointer", fontSize: "0.8rem" }}
                      title={courier.isActive ? "Desativar" : "Ativar"}
                    >{courier.isActive ? "⏸️" : "▶️"}</button>
                    <button 
                      onClick={() => handleDelete(courier.id)}
                      style={{ padding: "0.4rem 0.75rem", borderRadius: "var(--radius-md)", backgroundColor: "var(--error-light)", border: "1px solid var(--error)", color: "var(--error)", cursor: "pointer", fontSize: "0.8rem" }}
                    >🗑️</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
