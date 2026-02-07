import React from "react";

const navItems = [
  { label: "Overview", href: "/platform" },
  { label: "Tenants", href: "/platform/tenants" },
  { label: "Plans", href: "/platform/plans" },
];

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="sidebar-layout">
      <aside className="sidebar">
        <div className="logo">GymStack Admin</div>
        <p className="page-subtitle">Platform Operations</p>
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
