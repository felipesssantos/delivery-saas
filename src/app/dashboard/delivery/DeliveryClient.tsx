"use client";

import { useState } from "react";
import { updateBaseDeliveryFee, addDeliveryCity, removeDeliveryCity, addBlacklistNeighborhood, removeBlacklistNeighborhood } from "./actions";

type BlacklistedNeighborhood = {
  id: string;
  name: string;
};

type City = {
  id: string;
  name: string;
  blacklistedNeighborhoods: BlacklistedNeighborhood[];
};

type Props = {
  initialBaseFee: number;
  cities: City[];
};

export default function DeliveryClient({ initialBaseFee, cities }: Props) {
  const [baseFee, setBaseFee] = useState(initialBaseFee.toString());
  const [isSavingFee, setIsSavingFee] = useState(false);
  
  const [newCity, setNewCity] = useState("");
  const [isAddingCity, setIsAddingCity] = useState(false);

  // Blacklist form
  const [selectedCityId, setSelectedCityId] = useState("");
  const [newNeighborhood, setNewNeighborhood] = useState("");
  const [isAddingNeighborhood, setIsAddingNeighborhood] = useState(false);

  const handleSaveFee = async () => {
    try {
      setIsSavingFee(true);
      const parsedFee = parseFloat(baseFee.replace(",", "."));
      if (isNaN(parsedFee)) return alert("Valor inválido");
      await updateBaseDeliveryFee(parsedFee);
      alert("Taxa salva com sucesso!");
    } catch {
      alert("Erro ao salvar taxa.");
    } finally {
      setIsSavingFee(false);
    }
  };

  const handleAddCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCity.trim()) return;
    try {
      setIsAddingCity(true);
      await addDeliveryCity(newCity.trim());
      setNewCity("");
    } catch {
      alert("Erro ao adicionar cidade. Verifique se já não existe.");
    } finally {
      setIsAddingCity(false);
    }
  };

  const handleRemoveCity = async (id: string, name: string) => {
    if (!confirm(`Remover "${name}"? Todos os bairros bloqueados desta cidade também serão removidos.`)) return;
    try {
      await removeDeliveryCity(id);
    } catch {
      alert("Erro ao remover.");
    }
  };

  const handleAddNeighborhood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCityId || !newNeighborhood.trim()) return;
    try {
      setIsAddingNeighborhood(true);
      await addBlacklistNeighborhood(selectedCityId, newNeighborhood.trim());
      setNewNeighborhood("");
    } catch {
      alert("Erro ao bloquear bairro. Verifique se já não existe.");
    } finally {
      setIsAddingNeighborhood(false);
    }
  };

  const handleRemoveNeighborhood = async (id: string) => {
    if (!confirm("Desbloquear este bairro? Ele voltará a receber pedidos.")) return;
    try {
      await removeBlacklistNeighborhood(id);
    } catch {
      alert("Erro ao remover.");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      
      {/* SECTION 1: TAXA FIXA */}
      <div className="card" style={{ padding: "1.5rem", backgroundColor: "var(--surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>💰 Taxa de Entrega (Fixa)</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
          Valor único cobrado em todas as entregas. Futuramente integraremos cálculo por Km.
        </p>

        <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label className="label">Valor (R$)</label>
            <input 
              type="number" 
              step="0.01"
              className="input-field" 
              value={baseFee} 
              onChange={e => setBaseFee(e.target.value)} 
              placeholder="Ex: 5.00"
            />
          </div>
          <button 
            onClick={handleSaveFee}
            disabled={isSavingFee}
            className="btn-primary"
            style={{ height: "42px", padding: "0 1.5rem" }}
          >
            {isSavingFee ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>

      {/* SECTION 2: CIDADES ATENDIDAS */}
      <div className="card" style={{ padding: "1.5rem", backgroundColor: "var(--surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>🏙️ Cidades Atendidas</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
          Adicione as cidades onde sua loja realiza entregas. Se a cidade do cliente não estiver aqui, o pedido será recusado.
        </p>

        <form onSubmit={handleAddCity} style={{ display: "flex", gap: "1rem", alignItems: "flex-end", marginBottom: "1.5rem" }}>
          <div style={{ flex: 1 }}>
            <label className="label">Nome da Cidade</label>
            <input 
              type="text" 
              className="input-field" 
              value={newCity} 
              onChange={e => setNewCity(e.target.value)} 
              placeholder="Ex: Salvador"
            />
          </div>
          <button 
            type="submit"
            disabled={isAddingCity || !newCity.trim()}
            className="btn-primary"
            style={{ height: "42px", padding: "0 1.5rem" }}
          >
            {isAddingCity ? "..." : "Adicionar"}
          </button>
        </form>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
          {cities.length === 0 ? (
            <div style={{ textAlign: "center", padding: "1.5rem", border: "1px dashed var(--border)", borderRadius: "var(--radius-md)", color: "var(--text-secondary)", fontSize: "0.875rem", width: "100%" }}>
              Nenhuma cidade cadastrada. Adicione pelo menos uma para aceitar pedidos.
            </div>
          ) : (
            cities.map(city => (
              <div key={city.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", backgroundColor: "var(--background)", border: "1px solid var(--border)", borderRadius: "2rem", padding: "0.5rem 1rem" }}>
                <span style={{ fontWeight: 500 }}>{city.name}</span>
                <button 
                  onClick={() => handleRemoveCity(city.id, city.name)}
                  style={{ color: "var(--error)", background: "none", border: "none", fontWeight: "bold", cursor: "pointer", fontSize: "1.1rem" }}
                  title="Remover cidade"
                >
                  &times;
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* SECTION 3: BLACKLIST */}
      <div className="card" style={{ padding: "1.5rem", backgroundColor: "var(--surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          🚫 Bairros Bloqueados
          <span style={{ fontSize: "0.75rem", backgroundColor: "var(--error-light)", color: "var(--error)", padding: "0.15rem 0.5rem", borderRadius: "2rem" }}>Blacklist</span>
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
          Bloqueie bairros específicos dentro das cidades atendidas. Pedidos desses bairros serão recusados automaticamente.
        </p>

        {cities.length === 0 ? (
          <div style={{ textAlign: "center", padding: "1.5rem", border: "1px dashed var(--border)", borderRadius: "var(--radius-md)", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            Adicione uma cidade primeiro para poder bloquear bairros.
          </div>
        ) : (
          <>
            <form onSubmit={handleAddNeighborhood} style={{ display: "flex", gap: "1rem", alignItems: "flex-end", marginBottom: "1.5rem", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 200px" }}>
                <label className="label">Cidade</label>
                <select 
                  className="input-field" 
                  value={selectedCityId} 
                  onChange={e => setSelectedCityId(e.target.value)}
                  required
                >
                  <option value="">Selecione...</option>
                  {cities.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: "1 1 200px" }}>
                <label className="label">Nome do Bairro</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={newNeighborhood} 
                  onChange={e => setNewNeighborhood(e.target.value)} 
                  placeholder="Ex: Zona Rural"
                />
              </div>
              <button 
                type="submit"
                disabled={isAddingNeighborhood || !newNeighborhood.trim() || !selectedCityId}
                className="btn-secondary"
                style={{ height: "42px", padding: "0 1.5rem" }}
              >
                {isAddingNeighborhood ? "..." : "Bloquear"}
              </button>
            </form>

            {/* Grouped by City */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {cities.filter(c => c.blacklistedNeighborhoods.length > 0).length === 0 ? (
                <div style={{ textAlign: "center", padding: "1rem", border: "1px dashed var(--border)", borderRadius: "var(--radius-md)", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                  Nenhum bairro bloqueado. Todos os bairros das cidades cadastradas receberão entregas!
                </div>
              ) : (
                cities.filter(c => c.blacklistedNeighborhoods.length > 0).map(city => (
                  <div key={city.id}>
                    <h4 style={{ fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
                      📍 {city.name}
                    </h4>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                      {city.blacklistedNeighborhoods.map(n => (
                        <div key={n.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", backgroundColor: "var(--error-light)", border: "1px solid var(--error)", borderRadius: "2rem", padding: "0.35rem 0.75rem", fontSize: "0.875rem" }}>
                          <span>{n.name}</span>
                          <button 
                            onClick={() => handleRemoveNeighborhood(n.id)}
                            style={{ color: "var(--error)", background: "none", border: "none", fontWeight: "bold", cursor: "pointer" }}
                            title="Desbloquear bairro"
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

    </div>
  );
}
