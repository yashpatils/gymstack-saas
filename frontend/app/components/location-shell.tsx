import Link from 'next/link';

type LocationShellProps = {
  title: string;
  subtitle?: string | null;
  logoUrl?: string | null;
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  primaryColor?: string | null;
  accentGradient?: string | null;
  loginHref: string;
  joinHref: string;
  whiteLabelEnabled: boolean;
};

export function LocationShell({
  title,
  subtitle,
  logoUrl,
  heroTitle,
  heroSubtitle,
  primaryColor,
  accentGradient,
  loginHref,
  joinHref,
  whiteLabelEnabled,
}: LocationShellProps) {
  const sectionStyle = {
    borderColor: primaryColor ?? 'rgba(255,255,255,0.15)',
    background: accentGradient ?? 'rgba(15, 23, 42, 0.82)',
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-6">
      <section className="w-full rounded-2xl border p-8" style={sectionStyle}>
        {logoUrl ? <div className="mb-6 h-12 w-12 rounded bg-cover bg-center" style={{ backgroundImage: `url(${logoUrl})` }} aria-label={`${title} logo`} /> : null}
        <p className="text-xs uppercase tracking-[0.25em] text-slate-300">{title}</p>
        <h1 className="mt-2 text-4xl font-semibold text-white">{heroTitle ?? title}</h1>
        {heroSubtitle ?? subtitle ? <p className="mt-2 text-slate-200">{heroSubtitle ?? subtitle}</p> : null}
        <div className="mt-8 flex gap-3">
          <Link href={loginHref} className="button">Login</Link>
          <Link href={joinHref} className="button secondary">Join with invite</Link>
        </div>
        {!whiteLabelEnabled ? (
          <footer className="mt-8 border-t border-white/10 pt-4 text-xs text-slate-300">Powered by Gym Stack © 2026</footer>
        ) : null}
      </section>
    </main>
  );
}
