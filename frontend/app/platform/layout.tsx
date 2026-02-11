"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { ProtectedRoute } from "../../src/components/ProtectedRoute";
import { useAuth } from "../../src/providers/AuthProvider";

const navItems = [
  { label: "Status", href: "/platform/status" },
  { label: "Gyms", href: "/platform/gyms" },
  { label: "Users", href: "/platform/users" },
  { label: "Billing", href: "/platform/billing" },
  { label: "Settings", href: "/platform/settings" },
];

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const email = user?.email ?? "platform.user@gymstack.app";
  const initials = useMemo(() => {
    const source = email.split("@")[0] ?? "PU";
    return source.slice(0, 2).toUpperCase();
  }, [email]);

  return (
    <ProtectedRoute>
      <div className="platform-layout">
        <aside className="platform-sidebar">
          <div className="platform-brand">GymStack Platform</div>
          <nav aria-label="Platform navigation">
            <ul className="platform-nav-list">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`platform-nav-link ${
                        isActive ? "platform-nav-link--active" : ""
                      }`}
                    >
                      {item.label}
                    </Link>
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
    </ProtectedRoute>
  );
}
