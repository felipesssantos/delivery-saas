"use server";

import { auth } from "@/auth";

export async function sendTestMessage(formData: FormData) {
  const session = await auth();
  const storeId = (session?.user as any)?.storeId;
  if (!storeId) throw new Error("Não autorizado");

  const phone = formData.get("phone") as string;
  if (!phone || phone.length < 10) {
    throw new Error("Número de telefone inválido.");
  }

  const message = `*Teste do Delivery SaaS* 🚀\n\nSua integração com o WhatsApp foi concluída com sucesso! Agora você poderá receber pedidos e gerenciar entregas de forma automatizada.\n\n_Esta é uma mensagem automática._`;

  try {
    const response = await fetch("http://localhost:3001/api/send-message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        storeId,
        toPhone: phone,
        message,
        secret: process.env.API_SECRET || "default_secret" // Needs to match the one in bot service
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || "Erro ao enviar mensagem pelo bot.");
    }

    return { success: true };
  } catch (error: any) {
    console.error("Erro na Server Action:", error);
    throw new Error(error.message || "Erro na comunicação com o robô de WhatsApp.");
  }
}
