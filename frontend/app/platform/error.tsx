"use client";

import Link from "next/link";
import { useEffect } from "react";

type PlatformErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function PlatformError({ error, reset }: PlatformErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="page">
      <div className="mx-auto mt-16 max-w-2xl rounded-3xl border border-amber-300/30 bg-slate-900/80 p-10 text-center shadow-2xl shadow-slate-950/40">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300">Platform error</p>
        <h1 className="mt-4 text-3xl font-semibold text-white">Couldn&apos;t load this platform page.</h1>
        <p className="mt-4 text-base text-slate-300">
          Refresh this section or return to the platform home to continue.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="button">
            Try again
          </button>
          <Link href="/platform" className="button secondary">
            Back to platform
          </Link>
        </div>
      </div>
    </section>
  );
}
