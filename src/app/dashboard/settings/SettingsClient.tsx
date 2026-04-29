"use client";

import { useState, useTransition } from "react";
import styles from "./settings.module.css";
import { updateStoreSettings, toggleStoreStatus } from "./actions";

type StoreData = {
  name: string;
  phone: string | null;
  description: string | null;
  currency: string;
  openStatus: boolean;
  welcomeMessage: string | null;
};

export default function SettingsClient({ store }: { store: StoreData }) {
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(store.openStatus);
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

      <form onSubmit={handleSubmit} className="card">
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
    </div>
  );
}
