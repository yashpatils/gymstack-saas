import Link from 'next/link';
import type { ReactNode } from 'react';

type PlatformLayoutProps = {
  children: ReactNode;
};

export default function PlatformLayout({ children }: PlatformLayoutProps) {
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <header style={{ marginBottom: '2rem' }}>
        <p style={{ color: '#64748b', marginBottom: '0.5rem' }}>
          Platform administration
        </p>
        <h1 style={{ margin: 0 }}>GymStack Control Center</h1>
        <nav style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <Link href="/platform/tenants">Tenants</Link>
          <Link href="/platform/plans">Plans</Link>
        </nav>
      </header>
      <section>{children}</section>
    </div>
  );
}
