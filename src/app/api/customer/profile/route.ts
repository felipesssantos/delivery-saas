import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const phone = searchParams.get('phone');
  const storeId = searchParams.get('storeId');

  if (!phone || !storeId) {
    return NextResponse.json({ error: 'Faltando parâmetros' }, { status: 400 });
  }

  // Limpa tudo que não for número
  const cleanPhone = phone.replace(/\D/g, '');

  try {
    // Busca o cliente
    const customer = await prisma.customer.findUnique({
      where: {
        storeId_phone: {
          storeId,
          phone: cleanPhone,
        }
      }
    });

    if (!customer) {
      return NextResponse.json({ found: false });
    }

    // Puxa o último pedido para extrair o endereço
    const lastOrder = await prisma.order.findFirst({
      where: {
        customerId: customer.id,
        storeId: storeId,
        deliveryMethod: "DELIVERY" // Garantir que só puxa pedidos com endereço válido
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!lastOrder) {
      return NextResponse.json({ found: true, name: customer.name });
    }

    return NextResponse.json({
      found: true,
      name: customer.name,
      address: {
        cep: lastOrder.cep || '',
        street: lastOrder.street || '',
        number: lastOrder.number || '',
        complement: lastOrder.complement || '',
        neighborhood: lastOrder.neighborhood || '',
        city: lastOrder.city || '',
        state: lastOrder.state || '',
        latitude: lastOrder.latitude,
        longitude: lastOrder.longitude
      }
    });
  } catch (error) {
    console.error('Erro ao buscar perfil do cliente:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
