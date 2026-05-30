"use client";

import { useState, useTransition } from "react";
import styles from "./settings.module.css";
import { updateStoreSettings, toggleStoreStatus, updateUberDirect, updateStoreAddress } from "./actions";

type StoreData = {
  name: string;
  phone: string | null;
  description: string | null;
  currency: string;
  openStatus: boolean;
  welcomeMessage: string | null;
  uberDirectEnabled: boolean;
  acceptsPickup: boolean;
  storeStreet: string | null;
  storeNumber: string | null;
  storeNeighborhood: string | null;
  storeCity: string | null;
  storeState: string | null;
  storeCep: string | null;
};

export default function SettingsClient({ store }: { store: StoreData }) {
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(store.openStatus);
  const [uberEnabled, setUberEnabled] = useState(store.uberDirectEnabled);
  const [pickupEnabled, setPickupEnabled] = useState(store.acceptsPickup || false);
  const [message, setMessage] = useState("");

  const handleToggleStatus = async () => {
    const newStatus = !isOpen;
    setIsOpen(newStatus);
    await toggleStoreStatus(newStatus);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage("");
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      try {
        await updateStoreSettings(formData);
        setMessage("Configurações salvas com sucesso!");
        setTimeout(() => setMessage(""), 3000);
      } catch (err) {
        setMessage("Erro ao salvar.");
      }
    });
  };

  const handleToggleUber = async () => {
    const newStatus = !uberEnabled;
    setUberEnabled(newStatus);
    startTransition(async () => {
      try {
        await updateUberDirect(newStatus);
      } catch {
        setUberEnabled(!newStatus); // revert
      }
    });
  };

  const handleTogglePickup = async () => {
    const newStatus = !pickupEnabled;
    setPickupEnabled(newStatus);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append('acceptsPickupToggle', newStatus ? 'true' : 'false');
        await updateStoreSettings(formData);
      } catch {
        setPickupEnabled(!newStatus); // revert on error
      }
    });
  };

  const handleSaveAddress = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await updateStoreAddress(formData);
        setMessage("Endereço salvo com sucesso!");
        setTimeout(() => setMessage(""), 3000);
      } catch {
        setMessage("Erro ao salvar endereço.");
      }
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Configurações da Loja</h2>
          <p className={styles.subtitle}>Gerencie as informações públicas e status do seu delivery.</p>
        </div>
      </div>

      <div className={styles.switchContainer} onClick={handleToggleStatus} style={{ cursor: 'pointer' }}>
        <div className={styles.switchText}>
          <h3>Status do Delivery</h3>
          <p>Ligue ou desligue o recebimento de pedidos no seu catálogo.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: isOpen ? 'var(--success)' : 'var(--error)' }}>
            {isOpen ? "Aberto" : "Fechado"}
          </span>
          <div className={`${styles.toggleSwitch} ${isOpen ? styles.active : ''}`}>
            <div className={styles.toggleKnob} />
          </div>
        </div>
      </div>

      <div className={styles.switchContainer} onClick={handleTogglePickup} style={{ cursor: 'pointer', marginTop: '1rem', border: '1px solid var(--border)', padding: '1rem', borderRadius: 'var(--radius-lg)' }}>
        <div className={styles.switchText}>
          <h3>Aceitar Retirada no Local</h3>
          <p>Permita que o cliente busque o pedido na sua loja, não cobrando taxa de entrega.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: pickupEnabled ? 'var(--success)' : 'var(--text-secondary)' }}>
            {pickupEnabled ? "Ativo" : "Inativo"}
          </span>
          <div className={`${styles.toggleSwitch} ${pickupEnabled ? styles.active : ''}`}>
            <div className={styles.toggleKnob} />
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ marginTop: "1.5rem" }}>
        <h3 className={styles.cardTitle}>Informações Básicas</h3>
        
        {message && (
          <div style={{ padding: '1rem', background: 'var(--success-bg)', color: 'var(--success)', borderRadius: '6px', marginBottom: '1rem' }}>
            {message}
          </div>
        )}

        <div className={styles.formGrid}>
          <div>
            <label className="label" htmlFor="name">Nome da Loja</label>
            <input 
              id="name" 
              name="name" 
              defaultValue={store.name} 
              className="input-field" 
              required 
            />
          </div>
          <div>
            <label className="label" htmlFor="phone">WhatsApp de Contato</label>
            <input 
              id="phone" 
              name="phone" 
              defaultValue={store.phone || ""} 
              className="input-field" 
              placeholder="(11) 99999-9999"
            />
          </div>
          <div className={styles.fullWidth}>
            <label className="label" htmlFor="description">Descrição (Aparece no topo do catálogo)</label>
            <textarea 
              id="description" 
              name="description" 
              defaultValue={store.description || ""} 
              className="input-field" 
              rows={3} 
            />
          </div>
          <div>
            <label className="label" htmlFor="currency">Moeda</label>
            <select id="currency" name="currency" defaultValue={store.currency} className="input-field">
              <option value="BRL">Real (R$)</option>
              <option value="USD">Dólar ($)</option>
              <option value="EUR">Euro (€)</option>
            </select>
          </div>
          <div className={styles.fullWidth}>
            <label className="label" htmlFor="welcomeMessage">Mensagem de Boas-Vindas (WhatsApp)</label>
            <textarea 
              id="welcomeMessage" 
              name="welcomeMessage" 
              defaultValue={store.welcomeMessage || ""} 
              className="input-field" 
              rows={4} 
              placeholder="Ex: Olá! 👋 Bem-vindo(a) à {nome_loja}!..."
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              Dica: Use <strong>{"{nome_loja}"}</strong> para inserir o nome da sua loja automaticamente.
            </p>
          </div>
        </div>

        <div className={styles.footer}>
          <button type="submit" className="btn-primary" disabled={isPending}>
            {isPending ? "Salvando..." : "Salvar Configurações"}
          </button>
        </div>
      </form>

      {/* Uber Direct Section */}
      <div className="card" style={{ marginTop: "1.5rem" }}>
        <h3 className={styles.cardTitle}>🚗 Uber Direct</h3>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "1rem" }}>
          Solicite entregadores da Uber diretamente pelo painel. Sem motoboy próprio necessário.
        </p>

        <div className={styles.switchContainer} onClick={handleToggleUber} style={{ cursor: 'pointer', marginBottom: '1rem' }}>
          <div className={styles.switchText}>
            <h3>Ativar Uber Direct</h3>
            <p>Ao ativar, a opção "Uber Direct" aparecerá ao despachar pedidos.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: uberEnabled ? 'var(--success)' : 'var(--text-secondary)' }}>
              {uberEnabled ? "Ativo" : "Inativo"}
            </span>
            <div className={`${styles.toggleSwitch} ${uberEnabled ? styles.active : ''}`}>
              <div className={styles.toggleKnob} />
            </div>
          </div>
        </div>

        {uberEnabled && (
          <form onSubmit={handleSaveAddress}>
            <h4 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "0.75rem" }}>📍 Endereço da Loja (Ponto de Coleta)</h4>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginBottom: "1rem" }}>
              A Uber usa este endereço como ponto de partida para coletar os pedidos.
            </p>
            <div className={styles.formGrid}>
              <div>
                <label className="label">Rua</label>
                <input name="storeStreet" defaultValue={store.storeStreet || ""} className="input-field" placeholder="Rua das Flores" required />
              </div>
              <div>
                <label className="label">Número</label>
                <input name="storeNumber" defaultValue={store.storeNumber || ""} className="input-field" placeholder="123" required />
              </div>
              <div>
                <label className="label">Bairro</label>
                <input name="storeNeighborhood" defaultValue={store.storeNeighborhood || ""} className="input-field" placeholder="Centro" />
              </div>
              <div>
                <label className="label">Cidade</label>
                <input name="storeCity" defaultValue={store.storeCity || ""} className="input-field" placeholder="Salvador" required />
              </div>
              <div>
                <label className="label">Estado</label>
                <input name="storeState" defaultValue={store.storeState || ""} className="input-field" placeholder="BA" maxLength={2} required />
              </div>
              <div>
                <label className="label">CEP</label>
                <input name="storeCep" defaultValue={store.storeCep || ""} className="input-field" placeholder="40000-000" required />
              </div>
            </div>
            <div className={styles.footer}>
              <button type="submit" className="btn-primary" disabled={isPending}>
                {isPending ? "Salvando..." : "Salvar Endereço"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
