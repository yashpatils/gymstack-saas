"use client";

import Link from "next/link";
import { useEffect } from "react";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function RootError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="page">
      <section className="mx-auto mt-16 max-w-2xl rounded-3xl border border-red-400/30 bg-slate-900/80 p-10 text-center shadow-2xl shadow-slate-950/40">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-red-300">Something went wrong</p>
        <h1 className="mt-4 text-3xl font-semibold text-white">We hit an unexpected error.</h1>
        <p className="mt-4 text-base text-slate-300">
          Please try again. If the issue continues, head back home and retry from there.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="button">
            Try again
          </button>
          <Link href="/" className="button secondary">
            Go home
          </Link>
        </div>
      </section>
    </main>
  );
}
