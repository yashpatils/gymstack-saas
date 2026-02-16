import Link from 'next/link';
import type { ReactNode } from 'react';

type LocationShellProps = {
  title: string;
  subtitle: string;
  logoUrl: string | null;
  primaryColor: string | null;
  accentGradient: string | null;
  whiteLabelEnabled: boolean;
  children?: ReactNode;
};

export function LocationShell({
  title,
  subtitle,
  logoUrl,
  primaryColor,
  accentGradient,
  whiteLabelEnabled,
  children,
}: LocationShellProps) {
  const cardStyle = {
    borderColor: primaryColor ?? 'rgba(255,255,255,0.2)',
    background: accentGradient ?? 'linear-gradient(140deg, rgba(15,23,42,0.92), rgba(30,41,59,0.82))',
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-16 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl motion-safe:animate-pulse" />
        <div className="absolute -right-16 bottom-8 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl motion-safe:animate-pulse" />
      </div>

      <section
        className="relative w-full max-w-4xl rounded-3xl border border-white/20 p-8 shadow-2xl backdrop-blur-xl md:p-12"
        style={cardStyle}
      >
        <div className="mb-6 flex items-center gap-4">
          {logoUrl ? (
            <div
              className="h-14 w-14 rounded-xl bg-cover bg-center ring-1 ring-white/20"
              style={{ backgroundImage: `url(${logoUrl})` }}
              aria-label={`${title} logo`}
            />
          ) : null}
          <p className="text-xs uppercase tracking-[0.28em] text-slate-200">{title}</p>
        </div>

        <h1 className="text-4xl font-semibold leading-tight text-white md:text-5xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-base text-slate-200 md:text-lg">{subtitle}</p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 font-medium text-slate-900 transition hover:bg-slate-100"
          >
            Log in
          </Link>
          <Link
            href="/join?token="
            className="inline-flex items-center justify-center rounded-xl border border-white/30 bg-white/5 px-5 py-3 font-medium text-white transition hover:bg-white/10"
          >
            Join
          </Link>
        </div>

        {children}

        {!whiteLabelEnabled ? (
          <footer className="mt-8 border-t border-white/10 px-1 pt-4 text-xs text-slate-300">
            Powered by Gym Stack © 2026
          </footer>
        ) : null}
      </section>
    </main>
  );
}
