import Link from 'next/link';

type GymLandingProps = {
  title: string;
  subtitle?: string | null;
  loginHref: string;
  joinHref: string;
};

export function GymLanding({ title, subtitle, loginHref, joinHref }: GymLandingProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6">
      <section className="w-full rounded-2xl border border-white/15 bg-slate-900/80 p-8">
        <h1 className="text-4xl font-semibold text-white">{title}</h1>
        {subtitle ? <p className="mt-2 text-slate-300">{subtitle}</p> : null}
        <div className="mt-8 flex gap-3">
          <Link href={loginHref} className="button">Login</Link>
          <Link href={joinHref} className="button secondary">Join with invite</Link>
        </div>
      </section>
    </main>
  );
}
