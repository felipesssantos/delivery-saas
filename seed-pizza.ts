import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Pegar a primeira loja ativa
  const store = await prisma.store.findFirst();
  if (!store) {
    console.log("Nenhuma loja encontrada!");
    return;
  }

  // Pegar a categoria Pizzas ou criar uma
  let category = await prisma.category.findFirst({
    where: { name: "Pizzas", storeId: store.id }
  });

  if (!category) {
    category = await prisma.category.create({
      data: {
        name: "Pizzas",
        storeId: store.id,
        order: 1
      }
    });
  }

  // Criar o Produto "Pizza Grande (Meio a Meio)"
  const pizzaProduct = await prisma.product.create({
    data: {
      name: "Pizza Grande (2 Sabores)",
      description: "Escolha até 2 sabores. Será cobrado o valor da pizza mais cara.",
      price: 0, // O preço base é 0, o preço vem dos sabores
      categoryId: category.id,
      storeId: store.id, // Falto isso!
      order: 0,
      addons: {
        create: [
          {
            name: "Escolha os Sabores",
            isRequired: true,
            minSelect: 1,
            maxSelect: 2,
            pricingMethod: "HIGHEST", // Regra de cobrar a mais cara
            options: {
              create: [
                { name: "Calabresa", price: 45.00 },
                { name: "Bacon", price: 50.00 },
                { name: "Marguerita", price: 40.00 },
                { name: "Frango com Catupiry", price: 55.00 }
              ]
            }
          }
        ]
      }
    }
  });

  console.log("✅ Produto 'Pizza Grande (2 Sabores)' criado com sucesso com os adicionais!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
