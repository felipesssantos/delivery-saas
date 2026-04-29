import { auth } from "@/auth";
import { redirect } from "next/navigation";
import WhatsAppClient from "./WhatsAppClient";

export default async function WhatsAppPage() {
  const session = await auth();
  const storeId = (session?.user as any)?.storeId;

  if (!storeId) {
    redirect("/login");
  }

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.5rem", color: "var(--text-primary)" }}>WhatsApp Bot</h2>
        <p style={{ color: "var(--text-secondary)" }}>Conecte seu WhatsApp para habilitar notificações automáticas.</p>
      </div>

      <WhatsAppClient storeId={storeId} />
    </div>
  );
}
