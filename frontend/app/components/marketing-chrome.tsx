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
    <header className="border-b border-white/10 bg-slate-950/95">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/20 text-sm font-semibold text-indigo-200">
            GS
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">GymStack</p>
            <p className="text-xs text-slate-500">All-in-one gym operating system</p>
          </div>
        </Link>

        <nav className="order-3 flex w-full items-center justify-center gap-6 text-sm text-slate-300 sm:order-2 sm:w-auto">
          {navLinks.map((link) => (
            <Link key={link.label} href={link.href} className="transition hover:text-white">
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
    <footer className="border-t border-white/10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">GymStack SaaS</p>
          <p className="mt-2 text-slate-400">Launch, manage, and scale premium gym experiences.</p>
        </div>

        <div className="flex flex-wrap items-center gap-5">
          <Link href="/features" className="transition hover:text-white">Features</Link>
          <Link href="/pricing" className="transition hover:text-white">Pricing</Link>
          <Link href="/contact" className="transition hover:text-white">Contact</Link>
          <Link href="/terms" className="transition hover:text-white">Terms</Link>
          <Link href="/privacy" className="transition hover:text-white">Privacy</Link>
          <Link href="/cookies" className="transition hover:text-white">Cookies</Link>
        </div>
      </div>
      <p className="border-t border-white/10 py-5 text-center text-xs text-slate-500">© {new Date().getFullYear()} GymStack. All rights reserved.</p>
    </footer>
  );
}
