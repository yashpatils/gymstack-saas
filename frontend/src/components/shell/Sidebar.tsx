import Link from "next/link";

export type ShellNavItem = { label: string; href: string; disabled?: boolean };

export function Sidebar({ items, pathname }: { items: ShellNavItem[]; pathname: string }) {
  return (
    <aside className="hidden w-72 shrink-0 border-r border-border/70 bg-card/40 p-5 backdrop-blur xl:block">
      <div className="rounded-2xl border border-border/80 bg-black/20 p-4">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">GymStack</p>
        <p className="mt-2 text-lg font-semibold text-foreground">Platform</p>
      </div>
      <nav className="mt-6" aria-label="Platform navigation">
        <ul className="space-y-1">
          {items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const className = `block rounded-xl px-3 py-2 text-sm transition ${
              isActive
                ? "bg-primary/20 text-primary-foreground"
                : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
            } ${item.disabled ? "pointer-events-none opacity-40" : ""}`;

            return (
              <li key={item.href}>
                {item.disabled ? (
                  <span className={className}>{item.label}</span>
                ) : (
                  <Link href={item.href} className={className} aria-current={isActive ? "page" : undefined}>
                    {item.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
