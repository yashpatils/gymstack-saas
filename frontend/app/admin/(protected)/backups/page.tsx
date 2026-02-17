"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "../../../../src/lib/apiFetch";

type Backup = { id: string; tenantId: string; type: "snapshot"; createdAt: string; tenant: { name: string } | null };

export default function AdminBackupsPage() {
  const [tenantId, setTenantId] = useState("");
  const [backups, setBackups] = useState<Backup[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    const data = await apiFetch<Backup[]>("/api/admin/backups", { method: "GET", cache: "no-store" });
    setBackups(data);
  };

  useEffect(() => { void load(); }, []);

  const createBackup = async () => {
    if (!tenantId.trim()) return;
    await apiFetch(`/api/admin/backups/tenant/${tenantId.trim()}`, { method: "POST" });
    setMessage("Snapshot created.");
    await load();
  };

  const previewRestore = async (id: string) => {
    const data = await apiFetch<{ summary: string }>(`/api/admin/backups/${id}/restore/preview`, { method: "POST" });
    setMessage(data.summary);
  };

  const applyRestore = async (id: string) => {
    await apiFetch(`/api/admin/backups/${id}/restore`, { method: "POST", body: { confirmed: true } });
    setMessage("Restore confirmation submitted.");
  };

  return <section className="page space-y-4">
    <h1 className="text-2xl font-semibold">Tenant backups</h1>
    <p className="text-sm text-slate-400">Create snapshots and run restore dry-run checks.</p>
    <div className="flex flex-wrap gap-2">
      <input className="input max-w-sm" value={tenantId} onChange={(event) => setTenantId(event.target.value)} placeholder="Tenant ID" />
      <button className="button" type="button" onClick={() => void createBackup()}>Create backup</button>
    </div>
    {message ? <p className="text-sm text-cyan-200">{message}</p> : null}
    <div className="overflow-hidden rounded-xl border border-white/10">
      <table className="w-full text-left text-sm">
        <thead className="bg-white/5 text-slate-400"><tr><th className="px-3 py-2">Tenant</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Created</th><th className="px-3 py-2">Actions</th></tr></thead>
        <tbody>
          {backups.map((backup) => <tr key={backup.id} className="border-t border-white/10"><td className="px-3 py-2">{backup.tenant?.name ?? backup.tenantId}</td><td className="px-3 py-2">{backup.type}</td><td className="px-3 py-2">{new Date(backup.createdAt).toLocaleString()}</td><td className="px-3 py-2 space-x-2"><button className="button secondary" type="button" onClick={() => void previewRestore(backup.id)}>Dry-run restore</button><button className="button secondary" type="button" onClick={() => void applyRestore(backup.id)}>Confirm restore</button></td></tr>)}
        </tbody>
      </table>
    </div>
  </section>;
}
