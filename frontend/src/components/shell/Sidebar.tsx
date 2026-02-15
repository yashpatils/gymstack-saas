import Link from "next/link";

export type ShellNavItem = { label: string; href: string; disabled?: boolean };

type SidebarProps = {
  items: ShellNavItem[];
  pathname: string;
  mobileOpen?: boolean;
  onClose?: () => void;
};

const sections = [
  {
    title: "Core",
    routes: ["/platform", "/platform/gyms", "/platform/team"],
  },
  {
    title: "Operations",
    routes: ["/platform/billing", "/platform/coach", "/platform/client"],
  },
  {
    title: "Settings",
    routes: ["/platform/settings", "/admin"],
  },
] as const;

export function Sidebar({ items, pathname, mobileOpen = false, onClose }: SidebarProps) {
  const normalizedPathname = pathname.replace(/\/+$/, "") || "/";

  const isItemActive = (href: string) => {
    const normalizedHref = href.replace(/\/+$/, "") || "/";

    if (normalizedHref === "/platform") {
      return normalizedPathname === "/platform";
    }

    return normalizedPathname === normalizedHref || normalizedPathname.startsWith(`${normalizedHref}/`);
  };

  return (
    <aside className={`platform-sidebar-modern ${mobileOpen ? "platform-sidebar-open" : ""}`}>
      <div className="rounded-2xl border border-border/80 bg-black/20 p-4">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">GymStack</p>
        <p className="mt-2 text-lg font-semibold text-foreground">Platform</p>
      </div>
      <nav className="platform-sidebar-nav" aria-label="Platform navigation">
        {sections.map((section) => {
          const sectionItems = items.filter((item) => section.routes.some((route) => route === item.href));
          if (!sectionItems.length) {
            return null;
          }

          return (
            <div key={section.title} className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">{section.title}</p>
              <ul className="space-y-1">
                {sectionItems.map((item) => {
                  const isActive = isItemActive(item.href);
                  const className = `platform-nav-item ${isActive ? "platform-nav-item-active" : ""} ${item.disabled ? "pointer-events-none opacity-40" : ""}`;

                  return (
                    <li key={item.href}>
                      {item.disabled ? (
                        <span className={className}>{item.label}</span>
                      ) : (
                        <Link
                          href={item.href}
                          className={className}
                          onClick={onClose}
                          aria-current={isActive ? "page" : undefined}
                        >
                          {item.label}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
