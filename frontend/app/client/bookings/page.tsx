'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../../src/lib/apiFetch';
import { useAuth } from '../../../src/providers/AuthProvider';

type SessionItem = {
  id: string;
  startsAt: string;
  startsAtLocal?: string;
  timezone?: string;
  classTemplate: { title: string; capacity: number };
  _count: { bookings: number };
};

type Booking = { id: string; sessionId: string };

export default function ClientBookingsPage() {
  const { activeLocation } = useAuth();
  const gymId = activeLocation?.id;
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [bookings, setBookings] = useState<Record<string, string>>({});

  const range = useMemo(() => {
    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + 14);
    return { from: from.toISOString(), to: to.toISOString() };
  }, []);

  const load = async () => {
    if (!gymId) return;
    const [sessionRows, bookingRows] = await Promise.all([
      apiFetch<SessionItem[]>(`/api/gyms/${gymId}/sessions?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`),
      apiFetch<Array<Booking>>(`/api/location/my-bookings?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`),
    ]);
    setSessions(sessionRows);
    setBookings(Object.fromEntries(bookingRows.map((entry) => [entry.sessionId, entry.id])));
  };

  useEffect(() => { void load(); }, [gymId]);

  const bookOrCancel = async (sessionId: string) => {
    const bookingId = bookings[sessionId];
    if (bookingId) {
      await apiFetch(`/api/bookings/${bookingId}/cancel`, { method: 'POST' });
    } else {
      await apiFetch(`/api/sessions/${sessionId}/book`, { method: 'POST' });
    }
    await load();
  };

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Client Bookings</h1>
      {sessions.map((session) => {
        const isBooked = Boolean(bookings[session.id]);
        const isFull = session._count.bookings >= session.classTemplate.capacity;
        return (
          <article className="card flex items-center justify-between p-4" key={session.id}>
            <div>
              <p className="font-medium">{session.classTemplate.title}</p>
              <p className="text-sm text-muted-foreground">{session.startsAtLocal ?? new Date(session.startsAt).toLocaleString()} ({session.timezone ?? 'UTC'})</p>
            </div>
            <button className="button" disabled={!isBooked && isFull} onClick={() => void bookOrCancel(session.id)}>{isBooked ? 'Cancel' : isFull ? 'Full' : 'Book'}</button>
          </article>
        );
      })}
    </main>
  );
}
