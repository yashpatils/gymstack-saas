import Link from 'next/link';
import type { ReactNode } from 'react';
import { getLocationSession } from './_components/location-server-api';

const STAFF_ROLES = new Set(['TENANT_LOCATION_ADMIN', 'GYM_STAFF_COACH']);

type LayoutProps = {
  children: ReactNode;
};

export default async function LocationLayout({ children }: LayoutProps) {
  const session = await getLocationSession();
  const isStaff = STAFF_ROLES.has(session.role);

  const navItems = isStaff
    ? [
        { href: '/app/members', label: 'Members' },
        { href: '/app/attendance', label: 'Attendance Today' },
      ]
    : [
        { href: '/app/my-membership', label: 'My Membership' },
        { href: '/app/my-attendance', label: 'My Attendance' },
      ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 md:grid-cols-[250px_1fr]">
        <aside className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Location App</p>
          <h1 className="mt-3 text-xl font-semibold">Daily Operations</h1>
          <p className="mt-2 text-sm text-slate-300">Location: {session.locationId}</p>
          <nav className="mt-6 space-y-2">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="block rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-sm transition hover:border-cyan-300/50 hover:bg-slate-800">
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-6">{children}</main>
      </div>
    </div>
  );
}
