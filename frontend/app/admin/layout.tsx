import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { buildApiUrl } from "../../src/lib/api";
import type { AuthMeResponse } from "../../src/types/auth";

const adminNavItems = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/tenants", label: "Tenants" },
];

async function getSession(): Promise<AuthMeResponse | null> {
  const token = cookies().get("gymstack_token")?.value;

  if (!token) {
    return null;
  }

  const response = await fetch(buildApiUrl("/api/auth/me"), {
    method: "GET",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as AuthMeResponse;
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const isPlatformAdmin = session?.platformRole === "PLATFORM_ADMIN";

  if (!isPlatformAdmin) {
    redirect("/platform");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 lg:flex-row lg:gap-8">
        <aside className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur lg:w-64">
          <p className="mb-4 text-xs uppercase tracking-[0.3em] text-indigo-300">Platform Admin</p>
          <nav className="space-y-2">
            {adminNavItems.map((item) => (
              <Link key={item.href} href={item.href} className="block rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10">
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
