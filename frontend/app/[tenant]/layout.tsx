import React from "react";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Members", href: "/members" },
  { label: "Trainers", href: "/trainers" },
  { label: "Billing", href: "/billing" },
];

export default function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { tenant: string };
}) {
  return (
    <div className="sidebar-layout">
      <aside className="sidebar">
        <div className="logo">GymStack</div>
        <p className="page-subtitle">Tenant: {params.tenant}</p>
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

export function generateStaticParams() {
  return [{ tenant: "acme" }];
}
