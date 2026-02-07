"use client";

import React from "react";
import { AccessDenied, Badge } from "./ui";
import { getPlatformNavItems, platformRoleLabels } from "../lib/auth";
import { useSession } from "./session-provider";

export function PlatformShell({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const platformRole = session.platformRole;

  if (!platformRole) {
    return (
      <div className="page">
        <AccessDenied
          title="Platform access restricted"
          message="This area is limited to platform administrators and operations roles."
          details={[
            "Check that your account includes a platform role.",
            "Contact GymStack support to request elevated access.",
          ]}
        />
      </div>
    );
  }

  const navItems = getPlatformNavItems(platformRole);
  const roleLabel = platformRoleLabels[platformRole];

  return (
    <div className="sidebar-layout">
      <aside className="sidebar">
        <div className="logo">GymStack Admin</div>
        <p className="page-subtitle">Platform Operations</p>
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
