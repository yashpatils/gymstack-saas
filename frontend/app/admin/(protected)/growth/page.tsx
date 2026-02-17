import { adminApiFetch } from '../../_lib/server-admin-api';

type GrowthMetrics = {
  activationRate: number;
  trialToPaidConversion: number;
  averageLocationsPerTenant: number;
  mrrGrowthRate: number;
  churnRate: number;
};

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export default async function AdminGrowthPage() {
  const growth = await adminApiFetch<GrowthMetrics>('/api/admin/growth');

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-white/10 bg-slate-900/50 p-6">
        <h1 className="text-3xl font-semibold text-white">Growth Dashboard</h1>
        <p className="mt-1 text-sm text-slate-300">Activation, conversion, expansion, and churn indicators.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <article className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs text-slate-400">Activation rate</p><p className="mt-2 text-3xl text-white">{formatPercent(growth.activationRate)}</p></article>
        <article className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs text-slate-400">Trial → paid</p><p className="mt-2 text-3xl text-white">{formatPercent(growth.trialToPaidConversion)}</p></article>
        <article className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs text-slate-400">Avg locations / tenant</p><p className="mt-2 text-3xl text-white">{growth.averageLocationsPerTenant.toFixed(2)}</p></article>
        <article className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs text-slate-400">MRR growth proxy</p><p className="mt-2 text-3xl text-white">{formatPercent(growth.mrrGrowthRate)}</p></article>
        <article className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs text-slate-400">Churn rate</p><p className="mt-2 text-3xl text-white">{formatPercent(growth.churnRate)}</p></article>
      </div>
    </section>
  );
}
