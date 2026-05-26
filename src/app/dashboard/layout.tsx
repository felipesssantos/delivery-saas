"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import styles from './layout.module.css';
import StoreStatusToggle from '@/components/StoreStatusToggle';
import CashierStatusToggle from '@/components/CashierStatusToggle';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { name: 'Painel de Pedidos', href: '/dashboard' },
    { name: 'Cardápio', href: '/dashboard/menu' },
    { name: 'Complementos', href: '/dashboard/complements' },
    { name: 'Clientes', href: '/dashboard/customers' },
    { name: 'Fluxo de Caixa', href: '/dashboard/cashier' },
    { name: 'Relatórios', href: '/dashboard/reports' },
    { name: 'Entregas', href: '/dashboard/delivery' },
    { name: 'Entregadores', href: '/dashboard/couriers' },
    { name: 'WhatsApp Bot', href: '/dashboard/whatsapp' },
    { name: 'Configurações', href: '/dashboard/settings' },
  ];

  // Adicionar link de admin se necessário
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  const finalNavItems = isAdmin 
    ? [...navItems, { name: 'SaaS Admin', href: '/admin/stores' }] 
    : navItems;

  return (
    <div className={styles.dashboardLayout}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2>Delivery SaaS</h2>
        </div>
        <nav className={styles.nav}>
          {finalNavItems.map((item) => (
            <Link 
              key={item.href} 
              href={item.href}
              className={`${styles.navItem} ${pathname === item.href ? styles.navItemActive : ''}`}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className={styles.mainContent}>
        <header className={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Painel de Controle</h1>
            <StoreStatusToggle />
            <CashierStatusToggle />
          </div>
          <button 
            onClick={() => signOut({ callbackUrl: '/login' })}
            style={{ color: 'var(--error)', fontWeight: 500 }}
          >
            Sair
          </button>
        </header>
        <div className={styles.pageContent}>
          {children}
        </div>
      </main>
    </div>
  );
}
