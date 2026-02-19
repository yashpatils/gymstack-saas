"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../../src/providers/AuthProvider";
import { SidebarNav } from "../../../../src/components/shell/Sidebar";
import { ShellIcon } from "../../../../src/components/shell/ShellIcon";
import type { AppNavItem } from "../../../../src/components/shell/nav-config";

const previewItems: AppNavItem[] = [
  { label: "Overview", href: "/platform", icon: <ShellIcon name="home" width={16} height={16} />, section: "core" },
  { label: "Locations", href: "/platform/locations/settings", icon: <ShellIcon name="pin" width={16} height={16} />, section: "core" },
  { label: "Staff", href: "/platform/team", icon: <ShellIcon name="users" width={16} height={16} />, section: "core" },
  { label: "Invites", href: "/platform/invites", icon: <ShellIcon name="search" width={16} height={16} />, section: "operations" },
  { label: "Billing", href: "/platform/billing", icon: <ShellIcon name="card" width={16} height={16} />, section: "operations" },
  { label: "Analytics", href: "/platform/analytics", icon: <ShellIcon name="line" width={16} height={16} />, section: "operations" },
  { label: "Export", href: "/platform/data", icon: <ShellIcon name="database" width={16} height={16} />, section: "operations" },
  { label: "Settings", href: "/platform/settings", icon: <ShellIcon name="settings" width={16} height={16} />, section: "settings" },
  { label: "Account", href: "/platform/account", icon: <ShellIcon name="user" width={16} height={16} />, section: "settings" },
  { label: "Developer", href: "/platform/developer", icon: <ShellIcon name="flask" width={16} height={16} />, section: "settings" },
];

export default function ShellPreviewPage() {
  const router = useRouter();
  const { qaBypass, gatingStatus } = useAuth();

  const longList = useMemo(() => [...previewItems, ...previewItems.map((item, index) => ({ ...item, href: `${item.href}?clone=${index}`, label: `${item.label} ${index + 1}` }))], []);

  if (!qaBypass) {
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-6">
        <h1 className="text-2xl font-semibold">Shell preview unavailable</h1>
        <p className="text-muted-foreground">This route is QA-only. Sign in as PLATFORM_ADMIN or the ADMIN_EMAIL user to access it.</p>
        <button className="button" type="button" onClick={() => router.replace("/platform")}>Back to platform</button>
      </main>
    );
  }

  return (
    <main className="space-y-8 p-6">
      <section className="rounded-2xl border border-border bg-card p-5">
        <h1 className="text-2xl font-semibold">Platform shell preview</h1>
        <p className="mt-2 text-sm text-muted-foreground">Use this route to QA the platform shell states quickly. Toggle your browser width to inspect mobile drawer behavior under the fixed header.</p>
        <p className="mt-2 text-xs text-muted-foreground">Gating status (still evaluated while bypassed): {gatingStatus?.reasonCode ?? "UNKNOWN"}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/platform" className="button secondary">Return to platform</Link>
          <span className="badge">QA bypass active</span>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-lg font-semibold">Desktop expanded</h2>
          <div className="mt-4 h-[480px] overflow-hidden rounded-xl border border-border">
            <SidebarNav items={longList} title="Preview" subtitle="Desktop expanded" collapsed={false} />
          </div>
        </article>
        <article className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-lg font-semibold">Desktop collapsed</h2>
          <div className="mt-4 h-[480px] overflow-hidden rounded-xl border border-border">
            <SidebarNav items={longList} title="Preview" subtitle="Desktop collapsed" collapsed />
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-lg font-semibold">Mobile drawer states</h2>
        <p className="mt-1 text-sm text-muted-foreground">Resize to mobile width to validate open/closed drawer. On desktop this still renders as hidden by responsive rules.</p>
        <div className="mt-3 flex items-start gap-4">
          <div className="relative h-[420px] w-[320px] overflow-hidden rounded-xl border border-border bg-[var(--bg)]">
            <SidebarNav items={previewItems} title="Preview" subtitle="Mobile closed" mobileOpen={false} />
          </div>
          <div className="relative h-[420px] w-[320px] overflow-hidden rounded-xl border border-border bg-[var(--bg)]">
            <SidebarNav items={previewItems} title="Preview" subtitle="Mobile open" mobileOpen onClose={() => undefined} />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-lg font-semibold">Account dropdown QA</h2>
        <p className="mt-1 text-sm text-muted-foreground">Use the real account dropdown in the top-right header while on this route. Verify links navigate without logging out and only Logout clears auth.</p>
      </section>
    </main>
  );
}
