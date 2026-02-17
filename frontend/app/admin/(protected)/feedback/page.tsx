"use client";

import { useEffect, useState } from 'react';
import { createAdminChangelog, getReleaseStatus, listAdminChangelog, listAdminFeedback, updateAdminFeedback, updateReleaseStatus, type ChangelogAudience, type FeedbackCategory, type FeedbackItem, type FeedbackPriority, type FeedbackStatus, type ReleaseBuildStatus, type ReleaseStatus } from '../../../../src/lib/feedback';

const statuses: FeedbackStatus[] = ['open', 'planned', 'shipped'];
const priorities: FeedbackPriority[] = ['low', 'medium', 'high'];
const categories: FeedbackCategory[] = ['bug', 'improvement', 'feature'];
const audiences: ChangelogAudience[] = ['admin', 'tenant', 'staff', 'client'];
const buildStates: ReleaseBuildStatus[] = ['passing', 'failing', 'unknown'];

export default function AdminFeedbackPage() {
  const [tenantId, setTenantId] = useState('');
  const [status, setStatus] = useState<FeedbackStatus | ''>('');
  const [priority, setPriority] = useState<FeedbackPriority | ''>('');
  const [rows, setRows] = useState<FeedbackItem[]>([]);
  const [releaseStatus, setReleaseStatus] = useState<ReleaseStatus | null>(null);
  const [changelog, setChangelog] = useState<Array<{ id: string; title: string; description: string; audience: ChangelogAudience; createdAt: string }>>([]);
  const [version, setVersion] = useState('');
  const [lastDeployAt, setLastDeployAt] = useState('');
  const [buildStatus, setBuildStatus] = useState<ReleaseBuildStatus>('unknown');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [audience, setAudience] = useState<ChangelogAudience>('tenant');

  const load = async () => {
    const [feedbackData, release, changelogData] = await Promise.all([
      listAdminFeedback({ tenantId: tenantId || undefined, status: status || undefined, priority: priority || undefined }),
      getReleaseStatus(),
      listAdminChangelog(),
    ]);
    setRows(feedbackData);
    setReleaseStatus(release);
    setVersion(release.version);
    setLastDeployAt(release.lastDeployAt.slice(0, 16));
    setBuildStatus(release.buildStatus);
    setChangelog(changelogData);
  };

  useEffect(() => {
    void load();
  }, []);

  const applyFilters = async () => {
    const feedbackData = await listAdminFeedback({ tenantId: tenantId || undefined, status: status || undefined, priority: priority || undefined });
    setRows(feedbackData);
  };

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-2xl font-semibold text-white">Feedback operations</h1>
      </header>

      <article className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="text-lg font-semibold">Safe release indicator</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <input className="input" value={version} onChange={(event) => setVersion(event.target.value)} placeholder="Version" />
          <input className="input" type="datetime-local" value={lastDeployAt} onChange={(event) => setLastDeployAt(event.target.value)} />
          <select className="input" value={buildStatus} onChange={(event) => setBuildStatus(event.target.value as ReleaseBuildStatus)}>{buildStates.map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select>
        </div>
        <button
          type="button"
          className="button mt-3"
          onClick={async () => {
            await updateReleaseStatus({ version, lastDeployAt: new Date(lastDeployAt).toISOString(), buildStatus });
            await load();
          }}
        >
          Save release status
        </button>
        {releaseStatus ? <p className="mt-2 text-sm text-slate-300">Current: {releaseStatus.version} · {releaseStatus.buildStatus}</p> : null}
      </article>

      <article className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="text-lg font-semibold">Publish changelog</h2>
        <div className="mt-3 grid gap-3">
          <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Title" />
          <textarea className="input min-h-24" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Description" />
          <select className="input" value={audience} onChange={(event) => setAudience(event.target.value as ChangelogAudience)}>{audiences.map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select>
        </div>
        <button
          type="button"
          className="button mt-3"
          onClick={async () => {
            await createAdminChangelog({ title, description, audience });
            setTitle('');
            setDescription('');
            await load();
          }}
        >
          Add changelog entry
        </button>
        <ul className="mt-4 space-y-2 text-sm text-slate-300">
          {changelog.slice(0, 6).map((entry) => <li key={entry.id}>{entry.title} ({entry.audience})</li>)}
        </ul>
      </article>

      <article className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="text-lg font-semibold">Tenant feedback</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-4">
          <input className="input" value={tenantId} onChange={(event) => setTenantId(event.target.value)} placeholder="Tenant ID" />
          <select className="input" value={status} onChange={(event) => setStatus(event.target.value as FeedbackStatus | '')}><option value="">All status</option>{statuses.map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select>
          <select className="input" value={priority} onChange={(event) => setPriority(event.target.value as FeedbackPriority | '')}><option value="">All priority</option>{priorities.map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select>
          <button type="button" className="button secondary" onClick={() => void applyFilters()}>Apply filters</button>
        </div>

        <div className="mt-4 space-y-3">
          {rows.map((row) => (
            <div key={row.id} className="rounded-xl border border-white/10 bg-slate-950/40 p-3 text-sm">
              <p className="font-medium text-white">{row.message}</p>
              <p className="text-slate-300">Tenant: {row.tenant?.name ?? row.tenantId} · Page: {row.page}</p>
              <div className="mt-2 grid gap-2 md:grid-cols-4">
                <select className="input" defaultValue={row.status} onChange={async (event) => {
                  await updateAdminFeedback(row.id, { status: event.target.value as FeedbackStatus });
                  await applyFilters();
                }}>{statuses.map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select>
                <select className="input" defaultValue={row.category ?? ''} onChange={async (event) => {
                  const value = event.target.value as FeedbackCategory | '';
                  await updateAdminFeedback(row.id, { category: value || undefined });
                  await applyFilters();
                }}><option value="">No tag</option>{categories.map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select>
                <input className="input" defaultValue={row.taskId ?? ''} placeholder="taskId" onBlur={async (event) => {
                  await updateAdminFeedback(row.id, { taskId: event.target.value });
                }} />
                <span className="text-slate-400">Priority: {row.priority}</span>
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
