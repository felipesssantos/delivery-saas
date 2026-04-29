import Link from 'next/link';

export default function Home() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--background)' }}>
      <header style={{ padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ color: 'var(--primary)', fontSize: '1.5rem', fontWeight: 700 }}>Delivery SaaS</h1>
        <Link href="/login" className="btn-primary">Acessar Painel</Link>
      </header>

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem' }}>
        <div style={{ maxWidth: '600px' }}>
          <h2 style={{ fontSize: '3rem', color: 'var(--text-primary)', marginBottom: '1rem', lineHeight: 1.1 }}>
            Revolucione o seu <span style={{ color: 'var(--primary)' }}>Delivery</span> via WhatsApp
          </h2>
          <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            Automatize pedidos, gerencie entregadores e tenha um catálogo online premium para o seu restaurante sem pagar taxas abusivas.
          </p>
          <Link href="/login" className="btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
            Começar Agora
          </Link>
        </div>
      </main>
    </div>
  );
}
