import { adminApiFetch } from '../../../_admin/_lib/server-admin-api';

type MigrationStatus = {
  checkedAt: string;
  total: number;
  failedCount: number;
  failedMigrations: Array<{ migrationName: string; startedAt: string; logs: string | null }>;
  guidance: string[];
};

export default async function AdminMigrationOpsPage() {
  const status = await adminApiFetch<MigrationStatus>('/api/admin/ops/migration-status');

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Migration health</h1>
      <p className="text-sm text-slate-300">Checked: {new Date(status.checkedAt).toLocaleString()}</p>
      <p className="text-sm">Failed migrations: {status.failedCount} / {status.total}</p>
      {status.failedMigrations.length > 0 ? (
        <div className="rounded border border-rose-500/40 bg-rose-500/10 p-3 text-sm">
          {status.failedMigrations.map((migration) => (
            <p key={migration.migrationName}>{migration.migrationName} (started {new Date(migration.startedAt).toLocaleString()})</p>
          ))}
        </div>
      ) : <p className="text-emerald-300">No failed migrations detected.</p>}
      <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
        {status.guidance.map((step) => <li key={step}>{step}</li>)}
      </ul>
    </section>
  );
}
