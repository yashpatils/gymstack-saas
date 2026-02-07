import Link from 'next/link';
import type { ReactNode } from 'react';

type TenantLayoutProps = {
  children: ReactNode;
  params: { tenant: string };
};

export default function TenantLayout({ children, params }: TenantLayoutProps) {
  const tenantLabel = params.tenant?.replace('-', ' ') ?? 'Tenant';

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <header style={{ marginBottom: '2rem' }}>
        <p style={{ color: '#64748b', marginBottom: '0.5rem' }}>
          Tenant workspace
        </p>
        <h1 style={{ margin: 0 }}>{tenantLabel}</h1>
        <nav style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <Link href={`/${params.tenant}/dashboard`}>Dashboard</Link>
          <Link href={`/${params.tenant}/members`}>Members</Link>
          <Link href={`/${params.tenant}/trainers`}>Trainers</Link>
          <Link href={`/${params.tenant}/billing`}>Billing</Link>
        </nav>
      </header>
      <section>{children}</section>
    </div>
  );
}
