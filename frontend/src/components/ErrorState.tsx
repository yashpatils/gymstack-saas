'use client';

import Link from 'next/link';

type ErrorStateProps = {
  title: string;
  message: string;
  requestId?: string;
  retry: () => void;
  homeHref?: string;
  homeLabel?: string;
};

export function ErrorState({
  title,
  message,
  requestId,
  retry,
  homeHref = '/',
  homeLabel = 'Go home',
}: ErrorStateProps) {
  return (
    <main className="page">
      <section className="mx-auto mt-16 max-w-2xl rounded-3xl border border-red-400/30 bg-slate-900/80 p-10 text-center shadow-2xl shadow-slate-950/40">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-red-300">Something went wrong</p>
        <h1 className="mt-4 text-3xl font-semibold text-white">{title}</h1>
        <p className="mt-4 text-base text-slate-300">{message}</p>
        <p className="mt-3 text-xs text-slate-400">Request ID: {requestId ?? 'not available'}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={retry} className="button">
            Try again
          </button>
          <Link href={homeHref} className="button secondary">
            {homeLabel}
          </Link>
        </div>
      </section>
    </main>
  );
}
