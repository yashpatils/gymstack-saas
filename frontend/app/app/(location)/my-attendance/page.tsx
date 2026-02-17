import { getServerToken, locationApiFetch } from '../_components/location-server-api';

type MyAttendanceRow = {
  id: string;
  checkedInAt: string;
};

export default async function MyAttendancePage() {
  const token = getServerToken();
  const rows = await locationApiFetch<MyAttendanceRow[]>('/api/location/me/attendance', token);

  return (
    <section>
      <h2 className="text-2xl font-semibold">My Attendance</h2>
      <p className="mt-1 text-sm text-slate-300">Your complete attendance history for this location.</p>
      <ul className="mt-6 space-y-3">
        {rows.map((row) => (
          <li key={row.id} className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-100">
            {new Date(row.checkedInAt).toLocaleString()}
          </li>
        ))}
        {rows.length === 0 ? <li className="rounded-xl border border-dashed border-white/20 p-6 text-sm text-slate-400">No attendance yet. See you soon 👋</li> : null}
      </ul>
    </section>
  );
}
