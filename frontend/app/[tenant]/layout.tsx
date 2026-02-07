import React from "react";
import { TenantShell } from "../components/tenant-shell";

const staticTenants = ["atlas-fitness", "north-peak"];

export function generateStaticParams() {
  return staticTenants.map((tenant) => ({ tenant }));
}

export default function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { tenant: string };
}) {
  return <TenantShell tenantSlug={params.tenant}>{children}</TenantShell>;
}
