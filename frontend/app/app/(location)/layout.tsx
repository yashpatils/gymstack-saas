import Link from 'next/link';
import type { ReactNode } from 'react';
import { getLocationSession } from './_components/location-server-api';
import { NotificationBanner } from './_components/notification-banner';

const STAFF_ROLES = new Set(['TENANT_LOCATION_ADMIN', 'GYM_STAFF_COACH']);

type LayoutProps = {
  children: ReactNode;
};

export default async function LocationLayout({ children }: LayoutProps) {
  const session = await getLocationSession();
  const isStaff = STAFF_ROLES.has(session.role);
  const whiteLabelEnabled = Boolean(session.auth.tenantFeatures?.whiteLabelBranding || session.auth.tenantFeatures?.whiteLabelEnabled);

  const navItems = isStaff
    ? [
        { href: '/app/members', label: 'Members' },
        { href: '/app/attendance', label: 'Attendance Today' },
        { href: '/app/settings', label: 'Settings' },
      ]
    : [
        { href: '/app/my-membership', label: 'My Membership' },
        { href: '/app/my-attendance', label: 'My Attendance' },
        { href: '/app/settings', label: 'Settings' },
      ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20 md:pb-0">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/95 px-4 py-3 backdrop-blur">
        <p className="text-[10px] uppercase tracking-[0.25em] text-cyan-300">Location App</p>
        <h1 className="text-lg font-semibold">Daily Operations</h1>
      </header>
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-4 md:grid-cols-[250px_1fr] md:gap-6 md:py-6">
        <aside className="hidden rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur md:block">
          <p className="text-sm text-slate-300">Location: {session.locationId}</p>
          <nav className="mt-6 space-y-2">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="block rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm transition hover:border-cyan-300/50 hover:bg-slate-800">
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="space-y-4 rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-4 md:p-6">
          <NotificationBanner />
          {children}
          {!whiteLabelEnabled ? <p className="text-xs text-slate-400">Powered by Gym Stack</p> : null}
        </main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-slate-900/95 p-2 backdrop-blur md:hidden">
        <div className="grid grid-cols-3 gap-2">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-xl border border-white/10 px-3 py-3 text-center text-sm font-medium">
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
