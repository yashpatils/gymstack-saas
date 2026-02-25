'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../../src/lib/apiFetch';
import { useAuth } from '../../../src/providers/AuthProvider';

type ClassTemplate = { id: string; title: string; capacity: number };
type SessionRow = {
  id: string;
  startsAt: string;
  endsAt: string;
  startsAtLocal?: string;
  timezone?: string;
  classTemplate: { title: string; capacity: number };
  _count: { bookings: number };
};
type Roster = {
  bookings: Array<{ id: string; status: string; user: { email: string } }>;
};

export default function PlatformSchedulePage() {
  const { activeLocation, effectiveRole } = useAuth();
  const gymId = activeLocation?.id;
  const isStaff = effectiveRole === 'TENANT_OWNER' || effectiveRole === 'TENANT_LOCATION_ADMIN' || effectiveRole === 'GYM_STAFF_COACH';
  const [view, setView] = useState<'day' | 'week'>('week');
  const [classes, setClasses] = useState<ClassTemplate[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [roster, setRoster] = useState<Roster | null>(null);
  const [creating, setCreating] = useState(false);

  const range = useMemo(() => {
    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + (view === 'week' ? 7 : 1));
    return { from: from.toISOString(), to: to.toISOString() };
  }, [view]);

  const load = async () => {
    if (!gymId || !isStaff) return;
    const [classRows, sessionRows] = await Promise.all([
      apiFetch<ClassTemplate[]>(`/api/gyms/${gymId}/classes`),
      apiFetch<SessionRow[]>(`/api/gyms/${gymId}/sessions?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`),
    ]);
    setClasses(classRows);
    setSessions(sessionRows);
  };

  useEffect(() => { void load(); }, [gymId, view, isStaff]);

  const createClass = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!gymId) return;
    const form = new FormData(event.currentTarget);
    setCreating(true);
    setNotice(null);
    try {
      await apiFetch(`/api/gyms/${gymId}/classes`, {
        method: 'POST',
        body: {
          title: String(form.get('title')),
          capacity: Number(form.get('capacity')),
          description: String(form.get('description') || ''),
        },
      });
      setNotice('Class created.');
      event.currentTarget.reset();
      await load();
    } finally {
      setCreating(false);
    }
  };

  const createSession = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const classId = String(form.get('classId'));
    await apiFetch(`/api/classes/${classId}/sessions`, {
      method: 'POST',
      body: {
        startsAt: new Date(String(form.get('startsAt'))).toISOString(),
        endsAt: new Date(String(form.get('endsAt'))).toISOString(),
      },
    });
    setNotice('Session created.');
    event.currentTarget.reset();
    await load();
  };

  const openRoster = async (sessionId: string) => {
    setSelectedSession(sessionId);
    const data = await apiFetch<Roster>(`/api/location/sessions/${sessionId}/roster`);
    setRoster(data);
  };

  const checkIn = async (bookingId: string) => {
    await apiFetch(`/api/bookings/${bookingId}/checkin`, { method: 'POST' });
    if (selectedSession) {
      await openRoster(selectedSession);
    }
  };

  if (!isStaff) {
    return <main className="p-6">Staff access required.</main>;
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Platform Schedule</h1>
      {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
      <div className="flex gap-2"><button className="button" onClick={() => setView('day')}>Day</button><button className="button" onClick={() => setView('week')}>Week</button></div>

      <section className="grid gap-3 md:grid-cols-2">
        <form className="card space-y-3 p-4" onSubmit={createClass}>
          <h2 className="font-medium">Create class</h2>
          <input className="input" name="title" placeholder="Class title" required />
          <input className="input" name="capacity" type="number" min={1} max={500} defaultValue={15} required />
          <textarea className="input" name="description" placeholder="Description" />
          <button className="button" disabled={creating} type="submit">{creating ? 'Creating…' : 'Create Class'}</button>
        </form>

        <form className="card space-y-3 p-4" onSubmit={createSession}>
          <h2 className="font-medium">Create session</h2>
          <select className="input" name="classId" required>
            <option value="">Select class</option>
            {classes.map((entry) => <option key={entry.id} value={entry.id}>{entry.title}</option>)}
          </select>
          <input className="input" name="startsAt" type="datetime-local" required />
          <input className="input" name="endsAt" type="datetime-local" required />
          <button className="button" type="submit">Create Session</button>
        </form>
      </section>

      <section className="space-y-2">
        {sessions.map((session) => (
          <article key={session.id} className="card flex items-center justify-between p-4">
            <div>
              <p className="font-medium">{session.classTemplate.title}</p>
              <p className="text-sm text-muted-foreground">{session.startsAtLocal ?? new Date(session.startsAt).toLocaleString()} ({session.timezone ?? 'UTC'})</p>
              <p className="text-xs text-muted-foreground">{session._count.bookings}/{session.classTemplate.capacity} booked</p>
            </div>
            <button className="button" onClick={() => void openRoster(session.id)}>Roster</button>
          </article>
        ))}
      </section>

      {roster ? (
        <section className="card space-y-3 p-4">
          <h3 className="font-medium">Roster</h3>
          {roster.bookings.map((booking) => (
            <div className="flex items-center justify-between" key={booking.id}>
              <span>{booking.user.email} · {booking.status}</span>
              {booking.status !== 'CHECKED_IN' ? <button className="button" onClick={() => void checkIn(booking.id)}>Check in</button> : null}
            </div>
          ))}
        </section>
      ) : null}
    </main>
  );
}
