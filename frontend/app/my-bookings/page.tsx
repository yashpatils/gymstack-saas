'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../src/lib/apiFetch';

type Booking = {
  sessionId: string;
  status: string;
  session: {
    startsAt: string;
    classTemplate: { title: string };
  };
};

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);

  const range = useMemo(() => {
    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + 30);
    return { from: from.toISOString(), to: to.toISOString() };
  }, []);

  const load = async () => {
    const data = await apiFetch<Booking[]>(`/api/location/my-bookings?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`);
    setBookings(data);
  };

  useEffect(() => {
    void load();
  }, []);

  const cancel = async (sessionId: string) => {
    await apiFetch(`/api/location/sessions/${sessionId}/cancel-booking`, { method: 'POST' });
    await load();
  };

  return (
    <main className="mx-auto max-w-4xl space-y-5 p-6">
      <header className="rounded-xl border bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold">My Bookings</h1>
        <p className="text-sm text-slate-600">Upcoming classes for your active location.</p>
      </header>
      <section className="space-y-3">
        {bookings.length === 0 ? <div className="rounded-xl border border-dashed p-8 text-center text-slate-500">No upcoming bookings.</div> : null}
        {bookings.map((booking) => (
          <article key={booking.sessionId} className="flex items-center justify-between rounded-lg border bg-white px-4 py-3">
            <div>
              <p className="font-medium text-slate-900">{booking.session.classTemplate.title}</p>
              <p className="text-sm text-slate-600">{new Date(booking.session.startsAt).toLocaleString()}</p>
            </div>
            <button className="rounded-lg border px-3 py-1 text-sm" onClick={() => void cancel(booking.sessionId)}>Cancel</button>
          </article>
        ))}
      </section>
    </main>
  );
}
