import { adminApiFetch, getAdminSessionOrRedirect } from '../../../_lib/server-admin-api';

type JobLog = {
  id: string;
  type: string;
  status: string;
  attempts: number;
  error: string | null;
  createdAt: string;
  finishedAt: string | null;
};

export default async function AdminJobsPage() {
  await getAdminSessionOrRedirect();
  const response = await adminApiFetch<{ items: JobLog[] }>('/api/admin/ops/jobs');

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-2xl shadow-slate-950/40">
      <h1 className="text-2xl font-semibold text-white">Background Jobs</h1>
      <p className="mt-2 text-sm text-slate-300">Queue visibility for email, webhook, insight, reminder, and export jobs.</p>
      <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
        <table className="min-w-full divide-y divide-white/10 text-sm">
          <thead className="bg-white/5 text-left text-slate-300">
            <tr>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Attempts</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">Finished</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {response.items.map((job) => (
              <tr key={job.id}>
                <td className="px-3 py-2 text-slate-100">{job.type}</td>
                <td className="px-3 py-2 text-slate-300">{job.status}</td>
                <td className="px-3 py-2 text-slate-300">{job.attempts}</td>
                <td className="px-3 py-2 text-slate-300">{new Date(job.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2 text-slate-300">{job.finishedAt ? new Date(job.finishedAt).toLocaleString() : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
