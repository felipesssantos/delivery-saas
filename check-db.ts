import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const cities = await prisma.deliveryCity.findMany({
    include: {
      blacklistedNeighborhoods: true
    }
  });
  console.log("Delivery Cities:");
  console.dir(cities, { depth: null });
  
  const areas = await prisma.deliveryArea.findMany();
  console.log("All Delivery Areas:");
  console.dir(areas, { depth: null });
  
  const stores = await prisma.store.findMany({ select: { id: true, name: true, baseDeliveryFee: true }});
  console.log("Stores:");
  console.dir(stores, { depth: null });
}

main().finally(() => prisma.$disconnect());
