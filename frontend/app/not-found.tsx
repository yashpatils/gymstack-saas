import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page">
      <section className="mx-auto mt-16 max-w-2xl rounded-3xl border border-white/10 bg-slate-900/70 p-10 text-center shadow-2xl shadow-slate-950/40">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">404</p>
        <h1 className="mt-4 text-4xl font-semibold text-white">Page not found</h1>
        <p className="mt-4 text-base text-slate-300">
          The page you were looking for doesn&apos;t exist or may have been moved.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="button">
            Go home
          </Link>
          <Link href="/platform" className="button secondary">
            Go to platform
          </Link>
        </div>
      </section>
    </main>
  );
}
