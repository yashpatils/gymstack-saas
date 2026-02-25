import { adminApiFetch } from '../../_lib/server-admin-api';
import { firstString, toStringWithDefault } from '@/src/lib/safe';
import type { AppSearchParams } from '@/src/lib/pageProps';

type BackfillResult = {
  from: string;
  to: string;
  daysProcessed: number;
  locationsProcessed: number;
};

export default async function AdminMetricsPage({ searchParams }: { searchParams?: AppSearchParams }) {
  const from = toStringWithDefault(firstString(searchParams?.from), '');
  const to = toStringWithDefault(firstString(searchParams?.to), '');

  let result: BackfillResult | null = null;
  if (from && to) {
    const params = new URLSearchParams({ from, to });
    result = await adminApiFetch<BackfillResult>(`/api/admin/metrics/backfill?${params.toString()}`, { method: 'POST' });
  }

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">Metrics tools</h1>
        <p className="text-sm text-slate-300">Backfill analytics metrics for a date range.</p>
      </header>

      <form className="grid gap-3 rounded-2xl border border-white/10 bg-slate-900/40 p-4 md:max-w-xl md:grid-cols-[1fr_1fr_auto]">
        <input type="date" name="from" defaultValue={from} className="input px-3 py-2 text-sm text-white" required />
        <input type="date" name="to" defaultValue={to} className="input px-3 py-2 text-sm text-white" required />
        <button type="submit" className="button">Run backfill</button>
      </form>

      {result ? (
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
          Backfill completed for {result.from} → {result.to}. Days processed: {result.daysProcessed}. Locations processed: {result.locationsProcessed}.
        </div>
      ) : null}
    </section>
  );
}
