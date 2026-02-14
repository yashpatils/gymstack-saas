"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { RequireAuth } from "../../src/components/RequireAuth";
import { useAuth } from "../../src/providers/AuthProvider";

const adminNavItems = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/tenants", label: "Tenants" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const isPlatformAdmin = user?.role === "PLATFORM_ADMIN";

  useEffect(() => {
    if (!loading && !isPlatformAdmin) {
      router.replace("/platform");
    }
  }, [isPlatformAdmin, loading, router]);

  return (
    <RequireAuth>
      {isPlatformAdmin ? (
        <div className="min-h-screen bg-slate-950 text-slate-100">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 lg:flex-row lg:gap-8">
            <aside className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur lg:w-64">
              <p className="mb-4 text-xs uppercase tracking-[0.3em] text-indigo-300">Platform Admin</p>
              <nav className="space-y-2">
                {adminNavItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`block rounded-lg px-3 py-2 text-sm transition ${isActive ? "bg-indigo-500/25 text-indigo-100" : "text-slate-300 hover:bg-white/10"}`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </aside>
            <main className="flex-1">{children}</main>
          </div>
        </div>
      ) : null}
    </RequireAuth>
  );
}
