import React from "react";

const staticTenants = ["atlas-fitness", "north-peak"];

export function generateStaticParams() {
  return staticTenants.map((tenant) => ({ tenant }));
}

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Members", href: "/members" },
  { label: "Trainers", href: "/trainers" },
  { label: "Billing", href: "/billing" },
  { label: "Settings", href: "/settings" },
];

export default function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { tenant: string };
}) {
  return <TenantShell tenantSlug={params.tenant}>{children}</TenantShell>;
}
