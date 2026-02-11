"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { RequireAuth } from "../../src/components/RequireAuth";
import { apiFetch } from "../../src/lib/api";
import { useAuth } from "../../src/providers/AuthProvider";
import { canManageBilling, canManageUsers } from "../../src/lib/rbac";

const navItems = [
  { label: "Status", href: "/platform/status" },
  { label: "Diagnostics", href: "/platform/diagnostics" },
  { label: "Gyms", href: "/platform/gyms" },
  { label: "Users", href: "/platform/users", requires: "users" as const },
  { label: "Team", href: "/platform/team" },
  { label: "Billing", href: "/platform/billing", requires: "billing" as const },
  { label: "Settings", href: "/platform/settings" },
];

type OrganizationResponse = {
  id: string;
  name: string;
  createdAt: string;
};

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const [orgName, setOrgName] = useState<string>("-");

  const email = user?.email ?? "platform.user@gymstack.app";
  const initials = useMemo(() => {
    const source = email.split("@")[0] ?? "PU";
    return source.slice(0, 2).toUpperCase();
  }, [email]);

  useEffect(() => {
    let isMounted = true;

    const loadOrg = async () => {
      try {
        const org = await apiFetch<OrganizationResponse>("/api/org", {
          method: "GET",
        });

        if (isMounted) {
          setOrgName(org.name);
        }
      } catch {
        if (isMounted) {
          setOrgName("-");
        }
      }
    };

    if (user) {
      void loadOrg();
    }

    return () => {
      isMounted = false;
    };
  }, [user]);

  if (loading) {
    return (
      <div className="platform-layout" aria-busy="true" aria-live="polite">
        <aside className="platform-sidebar">
          <div className="platform-brand">GymStack Platform</div>
          <nav aria-label="Platform navigation">
            <ul className="platform-nav-list">
              {navItems.map((item) => (
                <li key={item.href}>
                  <span className="platform-nav-link">{item.label}</span>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <div className="platform-main-shell">
          <header className="platform-topbar">
            <div>
              <p className="platform-topbar-label">Platform</p>
              <p className="platform-topbar-email">Loading session...</p>
              <p className="platform-topbar-label">Organization: Loading...</p>
            </div>
            <span className="platform-avatar">...</span>
          </header>

          <main className="platform-main-content">
            <div className="card" role="status">
              Checking authentication...
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <RequireAuth>
      <div className="platform-layout">
        <aside className="platform-sidebar">
          <div className="platform-brand">GymStack Platform</div>
          <nav aria-label="Platform navigation">
            <ul className="platform-nav-list">
              {navItems.map((item) => {
                const disabled =
                  (item.requires === "users" && !canManageUsers(role))
                  || (item.requires === "billing" && !canManageBilling(role));
                const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <li key={item.href}>
                    {disabled ? (
                      <span
                        className="platform-nav-link opacity-50"
                        title="Insufficient permissions"
                      >
                        {item.label}
                      </span>
                    ) : (
                      <Link
                        href={item.href}
                        className={`platform-nav-link ${
                          isActive ? "platform-nav-link--active" : ""
                        }`}
                      >
                        {item.label}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        <div className="platform-main-shell">
          <header className="platform-topbar">
            <div>
              <p className="platform-topbar-label">Platform</p>
              <p className="platform-topbar-email">{email}</p>
              <p className="platform-topbar-label">Organization: {orgName}</p>
            </div>

            <details className="platform-user-menu">
              <summary className="platform-user-trigger" aria-label="User menu">
                <span className="platform-avatar">{initials}</span>
              </summary>
              <div className="platform-user-dropdown">
                <button type="button" className="button secondary" onClick={logout}>
                  Logout
                </button>
              </div>
            </details>
          </header>

          <main className="platform-main-content">{children}</main>
        </div>
      </div>
    </RequireAuth>
  );
}
