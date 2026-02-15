import Link from "next/link";
import type { Membership } from "../../types/auth";

export function Topbar({
  email,
  orgName,
  initials,
  memberships,
  companyName,
  showCompanyName,
  onLogout,
  canSwitchMode,
  activeMode,
  onSwitchMode,
}: {
  email: string;
  orgName: string;
  initials: string;
  memberships: Membership[];
  companyName?: string;
  showCompanyName?: boolean;
  onLogout: () => void;
  canSwitchMode: boolean;
  activeMode?: "OWNER" | "MANAGER";
  onSwitchMode: (mode: "OWNER" | "MANAGER") => void;
}) {
  return (
    <header className="platform-topbar-modern">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{orgName}</p>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {memberships.length > 1 ? <Link href="/select-workspace" className="button secondary">Workspace</Link> : null}
        {canSwitchMode ? (
          <div className="flex items-center gap-2 rounded-full border border-border/70 px-2 py-1 text-xs">
            <button type="button" className={`button ${activeMode === "OWNER" ? "secondary" : "ghost"}`} onClick={() => onSwitchMode("OWNER")}>Owner Console</button>
            <button type="button" className={`button ${activeMode === "MANAGER" ? "secondary" : "ghost"}`} onClick={() => onSwitchMode("MANAGER")}>Manager Console</button>
          </div>
        ) : null}
        <button type="button" className="button ghost" aria-label="Notifications">🔔</button>
        <div className="user-chip" title={email}>
          <span className="user-chip-avatar">{initials}</span>
          <span className="user-chip-email">{email}</span>
        </div>
        <button type="button" className="button secondary" onClick={onLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}
