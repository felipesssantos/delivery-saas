"use client";

import { useEffect, useState } from "react";
import { toggleStoreStatus } from "@/app/dashboard/settings/actions";

export default function StoreStatusToggle() {
  const [isOpen, setIsOpen] = useState<boolean | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    // Fetch initial status
    fetch("/api/store/status")
      .then((res) => res.json())
      .then((data) => setIsOpen(data.openStatus))
      .catch(() => setIsOpen(false));
  }, []);

  const handleToggle = async () => {
    if (isOpen === null || isToggling) return;

    const newStatus = !isOpen;

    // Alerta ao ABRIR a loja
    if (newStatus === true) {
      const confirmed = window.confirm(
        "⚠️ Antes de abrir a loja, certifique-se de que o WhatsApp Bot está conectado e funcionando corretamente.\n\n" +
        "Acesse a aba \"WhatsApp Bot\" no menu e utilize o botão \"Testar Robô\" para enviar uma mensagem de teste.\n\n" +
        "Deseja abrir a loja agora?"
      );
      if (!confirmed) return;
    }

    try {
      setIsToggling(true);
      await toggleStoreStatus(newStatus);
      setIsOpen(newStatus);
    } catch {
      alert("Erro ao mudar status da loja.");
    } finally {
      setIsToggling(false);
    }
  };

  if (isOpen === null) return <div style={{ width: "120px" }} />;

  return (
    <button 
      onClick={handleToggle}
      disabled={isToggling}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.4rem 1rem",
        borderRadius: "2rem",
        backgroundColor: isOpen ? "var(--success-bg)" : "var(--error-bg)",
        color: isOpen ? "var(--success)" : "var(--error)",
        border: `1px solid ${isOpen ? "var(--success)" : "var(--error)"}`,
        fontWeight: 600,
        fontSize: "0.85rem",
        cursor: "pointer",
        transition: "all 0.2s",
        opacity: isToggling ? 0.7 : 1
      }}
    >
      <span style={{ 
        width: "8px", 
        height: "8px", 
        borderRadius: "50%", 
        backgroundColor: isOpen ? "var(--success)" : "var(--error)",
        display: "inline-block"
      }} />
      {isToggling ? "..." : (isOpen ? "Loja Aberta" : "Loja Fechada")}
    </button>
  );
}
