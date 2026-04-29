"use client";

import { useEffect, useState, useRef, useTransition } from "react";
import { io, Socket } from "socket.io-client";
import Image from "next/image";
import { sendTestMessage } from "./actions";

let socket: Socket | null = null;

export default function WhatsAppClient({ storeId }: { storeId: string }) {
  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    // In production, you would point this to your actual server URL (e.g. wss://bot.yourdomain.com)
    // For local dev, we point it to the localhost port 3001
    socket = io("http://localhost:3001");

    socket.on("connect", () => {
      socket?.emit("join_store", storeId);
    });

    socket.on("status", (data: { status: "connecting" | "connected" | "disconnected" }) => {
      setStatus(data.status);
      if (data.status === "connected") {
        setQrCode(null);
      }
    });

    socket.on("qr_code", (data: { qr: string }) => {
      setQrCode(data.qr);
      setStatus("disconnected"); // It means it needs scanning
    });

    return () => {
      socket?.disconnect();
    };
  }, [storeId]);

  const handleLogout = () => {
    if (!confirm("Tem certeza que deseja desconectar o WhatsApp?")) return;
    socket?.emit("logout_store", storeId);
  };

  const handleTestMessage = async (formData: FormData) => {
    startTransition(async () => {
      try {
        await sendTestMessage(formData);
        alert("Mensagem de teste enviada com sucesso! Verifique seu WhatsApp.");
        formRef.current?.reset();
      } catch (error: any) {
        alert(error.message);
      }
    });
  };

  return (
    <div className="card" style={{ maxWidth: "500px", margin: "0 auto", textAlign: "center" }}>
      {status === "connected" ? (
        <div>
          <div style={{ 
            width: "80px", height: "80px", background: "var(--success-bg)", 
            borderRadius: "50%", margin: "0 auto 1.5rem", display: "flex", 
            alignItems: "center", justifyContent: "center", color: "var(--success)"
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <h3 style={{ fontSize: "1.25rem", color: "var(--success)", marginBottom: "0.5rem" }}>WhatsApp Conectado!</h3>
          <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>
            Seu robô já está pronto para enviar notificações de pedidos e recibos.
          </p>

          <div style={{ background: "white", padding: "1.5rem", borderRadius: "1rem", border: "1px solid var(--border-light)", marginBottom: "2rem", textAlign: "left" }}>
            <h4 style={{ marginBottom: "1rem" }}>Enviar mensagem de teste</h4>
            <form ref={formRef} action={handleTestMessage} style={{ display: "flex", gap: "1rem" }}>
              <input 
                type="text" 
                name="phone" 
                placeholder="DDD + Número (Ex: 11999999999)" 
                className="input-field" 
                required 
                disabled={isPending}
                style={{ flex: 1 }}
              />
              <button type="submit" className="btn-primary" disabled={isPending}>
                {isPending ? "Enviando..." : "Testar Robô"}
              </button>
            </form>
          </div>

          <button onClick={handleLogout} className="btn-primary" disabled={isPending} style={{ background: "var(--error)", border: "none", width: "100%" }}>
            Desconectar WhatsApp
          </button>
        </div>
      ) : (
        <div>
          <h3 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>Leitura de QR Code</h3>
          <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>
            Abra o WhatsApp no seu celular, vá em Aparelhos Conectados e aponte a câmera para o código abaixo.
          </p>
          
          <div style={{ 
            background: "white", padding: "1rem", borderRadius: "1rem", 
            display: "inline-block", minHeight: "280px", minWidth: "280px",
            boxShadow: "var(--shadow-sm)", border: "1px solid var(--border-light)"
          }}>
            {qrCode ? (
              <Image src={qrCode} alt="WhatsApp QR Code" width={250} height={250} unoptimized />
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "250px", color: "var(--text-tertiary)" }}>
                {status === "connecting" ? "Iniciando sessão..." : "Aguardando QR Code..."}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
