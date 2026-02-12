"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RequireAuth } from "../../src/components/RequireAuth";
import { apiFetch } from "../../src/lib/api";
import { canManageBilling, canManageUsers, normalizeRole } from "../../src/lib/rbac";
import { defaultFeatureFlags, getFeatureFlags } from "../../src/lib/settings";
import { useAuth } from "../../src/providers/AuthProvider";

const navItems = [
  { label: "Status", href: "/platform/status" },
  { label: "Diagnostics", href: "/platform/diagnostics" },
  { label: "Support", href: "/platform/support" },
  { label: "Gyms", href: "/platform/gyms" },
  { label: "Users", href: "/platform/users", requires: "users" as const },
  { label: "Audit", href: "/platform/audit", requires: "users" as const },
  { label: "Team", href: "/platform/team" },
  { label: "Billing", href: "/platform/billing", requires: "billing" as const },
  { label: "Settings", href: "/platform/settings" },
  { label: "Admin Settings", href: "/platform/admin/settings", requires: "owner" as const },
];

type OrganizationResponse = {
  id: string;
  name: string;
  createdAt: string;
};

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
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
  const [featureFlags, setFeatureFlags] = useState(defaultFeatureFlags);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const rawRole = user?.role ?? "MEMBER";
  const email = user?.email ?? "platform.user@gymstack.app";
  const role = normalizeRole(rawRole);
  const isAdmin = rawRole === "ADMIN" || role === "OWNER";
  const showDebugLinks = process.env.NODE_ENV !== "production" || isAdmin;
  const initials = useMemo(() => {
    const source = email.split("@")[0] ?? "PU";
    return source.slice(0, 2).toUpperCase();
  }, [email]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.readAt).length,
    [notifications],
  );

  const loadNotifications = useCallback(async () => {
    setNotificationsLoading(true);

    try {
      const latest = await apiFetch<NotificationItem[]>("/api/notifications", {
        method: "GET",
        cache: "no-store",
      });
      setNotifications(latest);
    } catch {
      setNotifications([]);
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    try {
      const updated = await apiFetch<NotificationItem>(`/api/notifications/${id}/read`, {
        method: "POST",
      });

      setNotifications((current) =>
        current.map((notification) =>
          notification.id === updated.id
            ? { ...notification, readAt: updated.readAt }
            : notification,
        ),
      );
    } catch {
      // no-op
    }
  }, []);

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

    const loadFeatureFlags = async () => {
      try {
        const flags = await getFeatureFlags();
        if (isMounted) {
          setFeatureFlags(flags);
        }
      } catch {
        if (isMounted) {
          setFeatureFlags(defaultFeatureFlags);
        }
      }
    };

    if (user) {
      void loadOrg();
      void loadFeatureFlags();
      void loadNotifications();
    }

    return () => {
      isMounted = false;
    };
  }, [loadNotifications, user]);

  if (loading) {
    return (
      <div className="platform-layout" aria-busy="true" aria-live="polite">
        <aside className="platform-sidebar">
          <div className="platform-brand">GymStack Platform</div>
          <nav aria-label="Platform navigation">
            <ul className="platform-nav-list">
              {navItems.filter((item) => !item.debugOnly || showDebugLinks).map((item) => (
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
                if (item.href === "/platform/billing" && !featureFlags.enableBilling) {
                  return null;
                }

                const disabled =
                  (item.requires === "users" && !canManageUsers(role))
                  || (item.requires === "billing" && !canManageBilling(role))
                  || (item.requires === "owner" && role !== "OWNER");
                const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <li key={item.href}>
                    {disabled ? (
                      <span
                        className="platform-nav-link opacity-50"
                        title="Insufficient permissions"
                        aria-disabled="true"
                      >
                        {item.label}
                      </span>
                    ) : (
                      <Link
                        href={item.href}
                        className={`platform-nav-link ${
                          isActive ? "platform-nav-link--active" : ""
                        }`}
                        aria-current={isActive ? "page" : undefined}
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

            <div className="platform-topbar-actions">
              <details className="platform-notification-menu">
                <summary
                  className="platform-notification-trigger"
                  aria-label="Notifications"
                  onClick={() => {
                    void loadNotifications();
                  }}
                >
                  <span aria-hidden="true">🔔</span>
                  {unreadCount > 0 ? (
                    <span className="platform-notification-badge">{unreadCount}</span>
                  ) : null}
                </summary>
                <div className="platform-notification-dropdown">
                  <p className="platform-notification-title">Notifications</p>
                  {notificationsLoading ? (
                    <p className="platform-notification-empty">Loading...</p>
                  ) : notifications.length === 0 ? (
                    <p className="platform-notification-empty">No notifications yet.</p>
                  ) : (
                    <ul className="platform-notification-list">
                      {notifications.map((notification) => (
                        <li key={notification.id} className="platform-notification-item">
                          <p className="platform-notification-item-title">{notification.title}</p>
                          <p className="platform-notification-item-body">{notification.body}</p>
                          {!notification.readAt ? (
                            <button
                              type="button"
                              className="platform-notification-read"
                              onClick={() => {
                                void markAsRead(notification.id);
                              }}
                            >
                              Mark as read
                            </button>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </details>

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
            </div>
          </header>

          <main className="platform-main-content">{children}</main>
        </div>
      </div>
    </RequireAuth>
  );
}
