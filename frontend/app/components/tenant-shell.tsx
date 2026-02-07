"use client";

import React from "react";
import { AccessDenied, Badge } from "./ui";
import {
  getTenantMembership,
  getTenantNavItems,
  tenantRoleLabels,
} from "../lib/auth";
import { useSession } from "./session-provider";

export function TenantShell({
  tenantSlug,
  children,
}: {
  tenantSlug: string;
  children: React.ReactNode;
}) {
  const session = useSession();
  const membership = getTenantMembership(session, tenantSlug);

  if (!membership) {
    return (
      <div className="page">
        <AccessDenied
          title="Tenant access restricted"
          message="Your account does not have permission to view this tenant workspace."
          details={[
            "Verify you're assigned to this tenant.",
            "Contact your workspace admin to request access.",
          ]}
        />
      </div>
    );
  }

  const navItems = getTenantNavItems(membership.role);
  const roleLabel = tenantRoleLabels[membership.role];

  return (
    <div className="sidebar-layout">
      <aside className="sidebar">
        <div className="logo">GymStack</div>
        <p className="page-subtitle">Tenant: {membership.name}</p>
        <div className="session-card">
          <div className="session-label">Signed in as</div>
          <div className="session-name">{session.name}</div>
          <Badge tone="success">{roleLabel}</Badge>
        </div>
        <ul className="nav-list">
          {navItems.map((item) => (
            <li key={item.href} className="nav-item">
              {item.label}
            </li>
          ))}
        </ul>
      </aside>
      {children}
    </div>
  );
}
