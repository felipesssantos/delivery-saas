const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);

  // Create store first
  const store = await prisma.store.create({
    data: {
      slug: 'delivery-saas',
      name: 'Delivery SaaS',
      description: 'Loja de teste',
      isActive: true,
      openStatus: true,
      baseDeliveryFee: 0,
    }
  });

  console.log('Store created:', store.id, store.slug);

  // Create user linked to store
  const user = await prisma.user.create({
    data: {
      email: 'admin@teste.com',
      password: hashedPassword,
      name: 'Admin',
      storeId: store.id,
    }
  });

  console.log('User created:', user.id, user.email);
  console.log('Done!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
