"use client";

import React from "react";
import {
  getTenantCapabilities,
  getTenantMembership,
  tenantRoleLabels,
} from "../lib/auth";
import { useSession } from "./session-provider";

export function TenantRoleSnapshot({ tenantSlug }: { tenantSlug: string }) {
  const session = useSession();
  const membership = getTenantMembership(session, tenantSlug);
  const roleLabel = membership ? tenantRoleLabels[membership.role] : "Unassigned";
  const capabilities = membership ? getTenantCapabilities(membership.role) : [];

  return (
    <div className="card">
      <h3>Current access level: {roleLabel}</h3>
      <p>
        Your permissions are scoped to the active tenant to keep data and
        workflows isolated across locations.
      </p>
      {capabilities.length ? (
        <ul className="access-denied-list">
          {capabilities.map((capability) => (
            <li key={capability}>{capability}</li>
          ))}
        </ul>
      ) : (
        <p>Ask an admin to assign you a tenant role.</p>
      )}
    </div>
  );
}
