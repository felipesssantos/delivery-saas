import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// POST /api/delivery/check-neighborhood
// Body: { storeId, city, neighborhood }
// Returns: { allowed, deliveryFee, reason? }
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { storeId, city, neighborhood } = body;

  console.log(`[API] Checking delivery for Store: ${storeId}, City: ${city}, Neighborhood: ${neighborhood}`);

  if (!storeId || !city) {
    console.warn(`[API] Missing parameters. Body:`, body);
    return NextResponse.json({ error: "storeId e city são obrigatórios" }, { status: 400 });
  }

  // Step 1: Check if the city is served
  const deliveryCity = await prisma.deliveryCity.findFirst({
    where: {
      storeId,
      isActive: true,
      name: { equals: city, mode: "insensitive" },
    },
    include: {
      blacklistedNeighborhoods: {
        where: { isActive: true },
        select: { name: true },
      },
    },
  });

  if (!deliveryCity) {
    return NextResponse.json({ allowed: false, reason: `Não realizamos entregas na cidade de "${city}".` });
  }

  // Step 2: Check if the neighborhood is blacklisted
  if (neighborhood) {
    const isBlacklisted = deliveryCity.blacklistedNeighborhoods.some(
      n => n.name.toLowerCase() === neighborhood.toLowerCase()
    );
    if (isBlacklisted) {
      return NextResponse.json({ allowed: false, reason: `Não realizamos entregas no bairro "${neighborhood}" em ${city}.` });
    }
  }

  // Get the store's base delivery fee
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { baseDeliveryFee: true, slug: true, name: true },
  });

  return NextResponse.json({
    allowed: true,
    deliveryFee: store?.baseDeliveryFee || 0,
    storeSlug: store?.slug,
    storeName: store?.name,
  });
}
