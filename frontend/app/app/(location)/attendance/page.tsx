import { getServerToken, locationApiFetch } from '../_components/location-server-api';

type AttendanceRow = {
  id: string;
  checkedInAt: string;
  memberId: string | null;
};

export default async function AttendanceTodayPage() {
  const token = getServerToken();
  const rows = await locationApiFetch<AttendanceRow[]>('/api/location/attendance/today', token);

  return (
    <section>
      <h2 className="text-2xl font-semibold">Attendance Today</h2>
      <p className="mt-1 text-sm text-slate-300">Live stream of member check-ins at this location.</p>

      <ul className="mt-6 space-y-3">
        {rows.map((row) => (
          <li key={row.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-medium text-slate-100">Member: {row.memberId ?? 'Unknown'}</p>
            <p className="text-xs text-slate-400">{new Date(row.checkedInAt).toLocaleString()}</p>
          </li>
        ))}
        {rows.length === 0 ? <li className="rounded-xl border border-dashed border-white/20 p-6 text-sm text-slate-400">No check-ins yet today.</li> : null}
      </ul>
    </section>
  );
}
