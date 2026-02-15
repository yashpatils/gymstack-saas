import Link from 'next/link';
import { getAdminSessionOrRedirect } from './_lib/server-admin-api';
import { SupportModePanel } from './support-mode-panel';

const adminNavItems = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/tenants', label: 'Tenants' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await getAdminSessionOrRedirect();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#312e81_0%,_#020617_48%,_#020617_100%)] text-slate-100">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="h-fit rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">Platform Admin</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Company Console</h2>
          <nav className="mt-6 space-y-2">
            {adminNavItems.map((item) => (
              <Link key={item.href} href={item.href} className="block rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10">
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="space-y-6"><SupportModePanel />{children}</main>
      </div>
    </div>
  );
}
