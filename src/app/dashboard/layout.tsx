"use client";

import { useState } from 'react';
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

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className={styles.dashboardLayout}>
      {/* Overlay for Mobile */}
      <div 
        className={`${styles.overlay} ${isSidebarOpen ? styles.overlayOpen : ''}`} 
        onClick={closeSidebar}
      />

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <h2>Delivery SaaS</h2>
          <button className={styles.closeButton} onClick={closeSidebar}>×</button>
        </div>
        <nav className={styles.nav}>
          {finalNavItems.map((item) => (
            <Link 
              key={item.href} 
              href={item.href}
              className={`${styles.navItem} ${pathname === item.href ? styles.navItemActive : ''}`}
              onClick={closeSidebar}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className={styles.mainContent}>
        <header className={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button className={styles.menuButton} onClick={toggleSidebar}>
              ☰
            </button>
            <h1 className={styles.pageTitle}>Painel</h1>
            {/* Keeping the status toggles slightly compacted on mobile could be needed, but flex will handle it */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <StoreStatusToggle />
              <CashierStatusToggle />
            </div>
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
