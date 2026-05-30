import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import StoreClient from "./StoreClient";

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Find the store by slug
  const store = await prisma.store.findUnique({
    where: { slug },
  });

  if (!store || !store.isActive) {
    notFound();
  }

  // Fetch delivery config: cities served + blacklisted neighborhoods
  const deliveryCities = await prisma.deliveryCity.findMany({
    where: { storeId: store.id, isActive: true },
    include: {
      blacklistedNeighborhoods: {
        where: { isActive: true },
        select: { name: true },
      },
    },
  });

  // Build a simple config object to pass to the client
  const deliveryConfig = {
    baseDeliveryFee: store.baseDeliveryFee,
    acceptsPickup: store.acceptsPickup,
    storeAddress: {
      street: store.storeStreet || '',
      number: store.storeNumber || '',
      neighborhood: store.storeNeighborhood || '',
      city: store.storeCity || '',
      state: store.storeState || '',
      cep: store.storeCep || ''
    },
    cities: deliveryCities.map(c => ({
      name: c.name.toLowerCase(),
      blacklistedNeighborhoods: c.blacklistedNeighborhoods.map(n => n.name.toLowerCase()),
    })),
  };

  // Find all active categories with active products for this store
  const categories = await prisma.category.findMany({
    where: { 
      storeId: store.id,
      isActive: true,
    },
    orderBy: { order: "asc" },
    include: {
      products: {
        where: { isActive: true },
        orderBy: { order: "asc" },
        include: {
          addonLinks: {
            include: {
              addonCategory: {
                include: { options: true }
              }
            }
          }
        }
      },
    },
  });
  // Transform addonLinks to the flat "addons" format the StoreClient expects
  const populatedCategories = categories
    .filter(c => c.products.length > 0)
    .map(cat => ({
      ...cat,
      products: cat.products.map(prod => ({
        ...prod,
        addons: prod.addonLinks.map(link => link.addonCategory),
      }))
    }));

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--background)", paddingBottom: "100px" }}>
      <header style={{ 
        backgroundColor: "var(--surface)", 
        padding: "2rem 1rem", 
        borderBottom: "1px solid var(--border)",
        textAlign: "center"
      }}>
        {store.logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img 
            src={store.logo} 
            alt={`Logo ${store.name}`} 
            style={{ width: "80px", height: "80px", borderRadius: "50%", objectFit: "cover", marginBottom: "1rem", boxShadow: "var(--shadow-md)" }}
          />
        )}
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
          {store.name}
        </h1>
        {store.description && (
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", maxWidth: "600px", margin: "0 auto 1rem" }}>
            {store.description}
          </p>
        )}
        <div style={{ display: "inline-block", padding: "0.3rem 1rem", borderRadius: "2rem", backgroundColor: store.openStatus ? "var(--success-bg)" : "var(--error-bg)", color: store.openStatus ? "var(--success)" : "var(--error)", fontSize: "0.875rem", fontWeight: 600 }}>
          {store.openStatus ? " Aberto Agora" : " Fechado"}
        </div>
      </header>

      <main style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem 1rem" }}>
        <StoreClient 
          store={store} 
          categories={populatedCategories} 
          deliveryConfig={deliveryConfig}
        />
      </main>
    </div>
  );
}
