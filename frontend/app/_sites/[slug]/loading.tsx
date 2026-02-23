export default function SiteLoadingPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-12">
      <section className="w-full animate-pulse rounded-3xl border border-white/10 bg-slate-900/80 p-10">
        <div className="h-4 w-40 rounded bg-slate-700" />
        <div className="mt-4 h-12 w-2/3 rounded bg-slate-700" />
        <div className="mt-4 h-5 w-full rounded bg-slate-700" />
        <div className="mt-2 h-5 w-5/6 rounded bg-slate-700" />
      </section>
    </main>
  );
}
