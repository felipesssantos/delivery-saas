import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10)

  // Criar uma loja teste
  const store = await prisma.store.upsert({
    where: { slug: 'teste-burger' },
    update: {},
    create: {
      name: 'Teste Burger',
      slug: 'teste-burger',
      currency: 'BRL',
    },
  })

  // Criar um usuário admin para a loja
  await prisma.user.upsert({
    where: { email: 'admin@teste.com' },
    update: {},
    create: {
      email: 'admin@teste.com',
      name: 'Administrador',
      password: hashedPassword,
      storeId: store.id,
    },
  })

  console.log('Seed executado com sucesso! Usuário: admin@teste.com / Senha: admin123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
