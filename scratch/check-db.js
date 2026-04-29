const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const storeId = 'cmoi48yvy0000in30lzun75zm';
  console.log('--- Cities ---');
  const cities = await prisma.deliveryCity.findMany({ where: { storeId } });
  console.log(JSON.stringify(cities, null, 2));

  console.log('--- Areas (Neighborhoods) ---');
  const areas = await prisma.deliveryArea.findMany({ where: { storeId } });
  console.log(JSON.stringify(areas, null, 2));
}

main().finally(() => prisma.$disconnect());
