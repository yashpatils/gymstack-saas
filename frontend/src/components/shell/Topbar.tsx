import Link from "next/link";
import type { Membership } from "../../types/auth";

export function Topbar({
  email,
  orgName,
  initials,
  memberships,
  selectedTenantId,
  onLogout,
}: {
  email: string;
  orgName: string;
  initials: string;
  memberships: Membership[];
  selectedTenantId: string;
  onLogout: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-background/70 px-4 py-3 backdrop-blur md:px-8">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{orgName}</p>
        <p className="text-sm text-foreground">{email}</p>
      </div>
      <div className="flex items-center gap-3">
        {memberships.length > 1 ? <Link href="/select-workspace" className="button secondary">Workspace</Link> : null}
        <button type="button" className="button ghost" aria-label="Notifications">🔔</button>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-xs font-semibold">{initials}</span>
        <button type="button" className="button secondary" onClick={onLogout}>
          Logout
        </button>
      </div>
      {selectedTenantId ? <p className="w-full text-xs text-muted-foreground">Active tenant: {selectedTenantId}</p> : null}
    </header>
  );
}
