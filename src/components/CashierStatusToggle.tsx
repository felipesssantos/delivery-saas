"use client";

import { useEffect, useState } from "react";
import { openCashier, closeCashier } from "@/app/dashboard/cashier/actions";
import { useRouter } from "next/navigation";

export default function CashierStatusToggle() {
  const [isActive, setIsActive] = useState<boolean | null>(null);
  const [cashierId, setCashierId] = useState<string | null>(null);
  const [isToggling, setIsToggling] = useState(false);
  const router = useRouter();

  const fetchStatus = () => {
    fetch("/api/cashier/status")
      .then((res) => res.json())
      .then((data) => {
        setIsActive(data.active);
        setCashierId(data.cashier?.id || null);
      })
      .catch(() => setIsActive(false));
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleToggle = async () => {
    if (isActive === null || isToggling) return;

    if (!isActive) {
      // Abrir caixa - Redirecionar ou pedir valor
      const value = window.prompt("Digite o valor inicial do fundo de caixa (R$):", "0");
      if (value === null) return;
      
      try {
        setIsToggling(true);
        await openCashier(parseFloat(value.replace(",", ".")) || 0);
        fetchStatus();
        router.refresh();
      } catch (err: any) {
        alert(err.message);
      } finally {
        setIsToggling(false);
      }
    } else {
      // Fechar caixa
      if (!confirm("Deseja fechar o caixa agora? Os pedidos concluídos serão arquivados.")) return;
      
      try {
        setIsToggling(true);
        if (cashierId) {
          await closeCashier(cashierId);
          fetchStatus();
          router.refresh();
        }
      } catch (err: any) {
        alert(err.message);
      } finally {
        setIsToggling(false);
      }
    }
  };

  if (isActive === null) return <div style={{ width: "130px" }} />;

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
        backgroundColor: isActive ? "var(--info-bg)" : "var(--border)",
        color: isActive ? "var(--info)" : "var(--text-secondary)",
        border: `1px solid ${isActive ? "var(--info)" : "var(--border)"}`,
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
        backgroundColor: isActive ? "var(--info)" : "var(--text-secondary)",
        display: "inline-block"
      }} />
      {isToggling ? "..." : (isActive ? "Caixa Aberto" : "Caixa Fechado")}
    </button>
  );
}
