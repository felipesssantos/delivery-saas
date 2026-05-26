import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createQuote } from "@/lib/uber-direct";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { storeId, dropoff } = body;

    if (!storeId || !dropoff || !dropoff.street || !dropoff.number || !dropoff.city || !dropoff.state || !dropoff.cep) {
      return NextResponse.json({ error: "Dados incompletos para cotação." }, { status: 400 });
    }

    // Buscar configurações da loja
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: {
        uberDirectEnabled: true,
        storeStreet: true,
        storeNumber: true,
        storeCity: true,
        storeState: true,
        storeCep: true,
        storeLatitude: true,
        storeLongitude: true,
      }
    });

    if (!store) {
      return NextResponse.json({ error: "Loja não encontrada." }, { status: 404 });
    }

    if (!store.uberDirectEnabled) {
      return NextResponse.json({ error: "Integração Uber Direct não está ativa para esta loja." }, { status: 400 });
    }

    if (!store.storeStreet || !store.storeNumber || !store.storeCity || !store.storeState || !store.storeCep) {
      return NextResponse.json({ error: "Endereço da loja incompleto. Impossível calcular frete." }, { status: 400 });
    }

    // Preparar dados do pickup
    const pickup = {
      street: store.storeStreet,
      number: store.storeNumber,
      city: store.storeCity,
      state: store.storeState,
      cep: store.storeCep,
      latitude: store.storeLatitude || undefined,
      longitude: store.storeLongitude || undefined,
    };

    // Obter cotação da Uber
    const quote = await createQuote(pickup, dropoff);

    return NextResponse.json({
      fee: quote.fee / 100, // Converte centavos para reais
      estimatedMinutes: quote.estimatedMinutes,
      quoteId: quote.id,
      expiresAt: quote.expiresAt
    });

  } catch (error: any) {
    console.error("[Uber Quote Error]:", error);
    return NextResponse.json({ error: error.message || "Erro ao cotar entrega." }, { status: 500 });
  }
}
