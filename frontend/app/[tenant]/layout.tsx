import React from "react";
import { TenantShell } from "../components/tenant-shell";

export const dynamic = "force-dynamic";

export default function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { tenant: string };
}) {
  return <TenantShell tenantSlug={params.tenant}>{children}</TenantShell>;
}
