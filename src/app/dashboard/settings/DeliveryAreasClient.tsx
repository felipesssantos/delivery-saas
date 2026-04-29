"use client";

import { useTransition, useRef, useState } from "react";
import styles from "./settings.module.css";
import { addDeliveryArea, deleteDeliveryArea } from "./actions";

type DeliveryArea = {
  id: string;
  name: string;
  fee: number;
  isBlacklist: boolean;
};

export default function DeliveryAreasClient({ areas }: { areas: DeliveryArea[] }) {
  const [isPending, startTransition] = useTransition();
  const [isBlacklistMode, setIsBlacklistMode] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      try {
        await addDeliveryArea(formData);
        formRef.current?.reset();
      } catch (err) {
        alert("Erro ao adicionar bairro.");
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Tem certeza que deseja remover este bairro?")) return;
    startTransition(async () => {
      try {
        await deleteDeliveryArea(id);
      } catch (err) {
        alert("Erro ao remover.");
      }
    });
  };

  return (
    <div className="card">
      <h3 className={styles.cardTitle}>Áreas de Entrega e Taxas</h3>
      
      <div className={styles.list}>
        {areas.length === 0 && <p style={{ color: "var(--text-tertiary)" }}>Nenhum bairro cadastrado.</p>}
        {areas.map(area => (
          <div key={area.id} className={styles.listItem}>
            <div className={styles.listItemInfo}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {area.name}
                {area.isBlacklist && (
                  <span style={{ fontSize: '0.75rem', background: 'var(--error-bg)', color: 'var(--error)', padding: '0.1rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                    Não Entregamos
                  </span>
                )}
              </h4>
              <p>{area.isBlacklist ? "Local bloqueado para entregas." : `Taxa de entrega: R$ ${area.fee.toFixed(2).replace('.', ',')}`}</p>
            </div>
            <button 
              onClick={() => handleDelete(area.id)}
              className={styles.btnDanger}
              disabled={isPending}
            >
              Excluir
            </button>
          </div>
        ))}
      </div>

      <form ref={formRef} onSubmit={handleAdd} className={styles.formRow}>
        <div style={{ flex: 2 }}>
          <label className="label" htmlFor="name">Nome do Bairro</label>
          <input 
            id="name" 
            name="name" 
            className="input-field" 
            placeholder="Ex: Centro" 
            required 
            disabled={isPending}
          />
        </div>
        
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', alignSelf: 'center', paddingTop: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <input 
              type="checkbox" 
              name="isBlacklist" 
              value="true"
              checked={isBlacklistMode}
              onChange={(e) => setIsBlacklistMode(e.target.checked)}
              disabled={isPending}
            />
            Bloquear entregas (Blacklist)
          </label>
        </div>

        {!isBlacklistMode && (
          <div style={{ flex: 1 }}>
            <label className="label" htmlFor="fee">Taxa (R$)</label>
            <input 
              id="fee" 
              name="fee" 
              className="input-field" 
              placeholder="Ex: 5,00" 
              required={!isBlacklistMode}
              disabled={isPending}
            />
          </div>
        )}

        <div>
          <button type="submit" className="btn-primary" disabled={isPending} style={{ height: "46px" }}>
            Adicionar
          </button>
        </div>
      </form>
    </div>
  );
}
