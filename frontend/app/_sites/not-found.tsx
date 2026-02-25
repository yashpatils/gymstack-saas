import Link from 'next/link';

export default function SitesNotFoundPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6">
      <section className="w-full rounded-2xl border border-white/15 bg-slate-900/80 p-8">
        <h1 className="text-3xl font-semibold text-white">Location not found</h1>
        <p className="mt-2 text-slate-300">The public location page you requested is not available.</p>
        <Link className="button mt-6 inline-flex" href="/">
          Back to main site
        </Link>
      </section>
    </main>
  );
}
