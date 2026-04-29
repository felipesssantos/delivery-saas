"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import styles from './layout.module.css';
import StoreStatusToggle from '@/components/StoreStatusToggle';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { name: 'Painel de Pedidos', href: '/dashboard' },
    { name: 'Cardápio', href: '/dashboard/menu' },
    { name: 'Entregas', href: '/dashboard/delivery' },
    { name: 'Entregadores', href: '/dashboard/couriers' },
    { name: 'WhatsApp Bot', href: '/dashboard/whatsapp' },
    { name: 'Configurações', href: '/dashboard/settings' },
  ];

  return (
    <div className={styles.dashboardLayout}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2>Delivery SaaS</h2>
        </div>
        <nav className={styles.nav}>
          {navItems.map((item) => (
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Painel de Controle</h1>
            <StoreStatusToggle />
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
