import { adminApiFetch } from '../../../_admin/_lib/server-admin-api';

type BackupStatus = {
  provider: string;
  backupsEnabled: boolean;
  lastBackupAt: string | null;
  checklist: string[];
};

export default async function AdminBackupOpsPage() {
  const status = await adminApiFetch<BackupStatus>('/api/admin/ops/backups');

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Backup status</h1>
      <p className="text-sm text-slate-300">Provider: {status.provider}</p>
      <p className="text-sm">Backups enabled: {status.backupsEnabled ? 'Yes' : 'No / unknown'}</p>
      <p className="text-sm">Last backup: {status.lastBackupAt ?? 'Not reported'}</p>
      <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
        {status.checklist.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </section>
  );
}
