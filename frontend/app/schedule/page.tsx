'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ApiFetchError, apiFetch } from '../../src/lib/apiFetch';
import { useAuth } from '../../src/providers/AuthProvider';

type ScheduleItem = {
  sessionId: string;
  classTitle: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  bookedCount: number;
  isBookedByMe: boolean;
};

type ClassTemplate = { id: string; title: string; isActive?: boolean };

export default function SchedulePage() {
  const { effectiveRole } = useAuth();
  const isStaff = effectiveRole === 'TENANT_OWNER' || effectiveRole === 'TENANT_LOCATION_ADMIN' || effectiveRole === 'GYM_STAFF_COACH';
  const [sessions, setSessions] = useState<ScheduleItem[]>([]);
  const [classes, setClasses] = useState<ClassTemplate[]>([]);
  const [classId, setClassId] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const range = useMemo(() => {
    const now = new Date();
    const week = new Date(now);
    week.setDate(now.getDate() + 7);
    return { from: now.toISOString(), to: week.toISOString() };
  }, []);

  const load = async () => {
    const data = await apiFetch<ScheduleItem[]>(`/api/location/schedule?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`);
    setSessions(data);
    if (isStaff) {
      const templates = await apiFetch<ClassTemplate[]>('/api/location/classes');
      setClasses(templates.filter((entry) => entry.isActive !== false));
    }
  };

  useEffect(() => {
    void load();
  }, [isStaff]);

  const bookOrCancel = async (sessionId: string, isBooked: boolean) => {
    try {
      await apiFetch(`/api/location/sessions/${sessionId}/${isBooked ? 'cancel-booking' : 'book'}`, { method: 'POST' });
      setNotice(null);
      await load();
    } catch (error) {
      if (error instanceof ApiFetchError && error.message.includes('SESSION_FULL')) {
        setNotice('This class is full.');
        return;
      }
      if (error instanceof ApiFetchError && error.statusCode === 403) {
        setNotice('Membership required to book. Please activate membership first.');
        return;
      }
      throw error;
    }
  };

  const createSession = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await apiFetch('/api/location/sessions', {
      method: 'POST',
      body: {
        classId,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
      },
    });
    setStartsAt('');
    setEndsAt('');
    await load();
  };

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Schedule</h1>
        <p className="text-sm text-slate-600">Upcoming classes for the next 7 days.</p>
        {notice ? <p className="mt-2 text-sm text-amber-600">{notice}</p> : null}
      </header>

      {isStaff ? (
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Create Session</h2>
          <form className="mt-4 grid gap-3 md:grid-cols-4" onSubmit={createSession}>
            <select className="rounded-lg border px-3 py-2" value={classId} onChange={(event) => setClassId(event.target.value)} required>
              <option value="">Select class</option>
              {classes.map((entry) => <option key={entry.id} value={entry.id}>{entry.title}</option>)}
            </select>
            <input className="rounded-lg border px-3 py-2" type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} required />
            <input className="rounded-lg border px-3 py-2" type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} required />
            <button className="rounded-lg bg-slate-900 px-4 py-2 text-white" type="submit">Create</button>
          </form>
        </section>
      ) : null}

      <section className="grid gap-3">
        {sessions.map((item) => {
          const full = item.bookedCount >= item.capacity;
          return (
            <article key={item.sessionId} className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{item.classTitle}</h3>
                  <p className="text-sm text-slate-600">{new Date(item.startsAt).toLocaleString()} - {new Date(item.endsAt).toLocaleTimeString()}</p>
                  <p className="text-xs text-slate-500">{item.bookedCount}/{item.capacity} booked</p>
                </div>
                {!isStaff ? (
                  <button
                    disabled={!item.isBookedByMe && full}
                    className="rounded-lg border px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => void bookOrCancel(item.sessionId, item.isBookedByMe)}
                  >
                    {item.isBookedByMe ? 'Cancel Booking' : full ? 'Full' : 'Book'}
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
