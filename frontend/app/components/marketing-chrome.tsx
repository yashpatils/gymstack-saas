import Link from "next/link";
import { AuthNav } from "./auth-nav";

const navLinks = [
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Contact", href: "/contact" },
  { label: "Status", href: "/status" },
];

export function MarketingNavbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-[var(--surface-overlay)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--brand-100)] text-sm font-semibold text-[var(--accent)]">
            GS
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground">GymStack</p>
            <p className="text-xs text-muted-foreground">All-in-one gym operating system</p>
          </div>
        </Link>

        <nav className="order-3 flex w-full items-center justify-center gap-6 text-sm text-muted-foreground sm:order-2 sm:w-auto">
          {navLinks.map((link) => (
            <Link key={link.label} href={link.href} className="transition hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>

        <AuthNav />
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-[var(--surface-2)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">GymStack SaaS</p>
          <p className="mt-2 text-muted-foreground">Launch, manage, and scale premium gym experiences.</p>
        </div>

        <div className="flex flex-wrap items-center gap-5">
          <Link href="/features" className="transition hover:text-foreground">Features</Link>
          <Link href="/pricing" className="transition hover:text-foreground">Pricing</Link>
          <Link href="/contact" className="transition hover:text-foreground">Contact</Link>
          <Link href="/terms" className="transition hover:text-foreground">Terms</Link>
          <Link href="/privacy" className="transition hover:text-foreground">Privacy</Link>
          <Link href="/cookies" className="transition hover:text-foreground">Cookies</Link>
        </div>
      </div>
      <p className="border-t border-border py-5 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} GymStack. All rights reserved.</p>
    </footer>
  );
}
