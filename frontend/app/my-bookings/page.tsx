'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../src/lib/apiFetch';
import { EmptyState, Skeleton } from '../components/ui';
import { SupportHelpButton } from '../../src/components/SupportHelpButton';

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
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  const range = useMemo(() => {
    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + 30);
    return { from: from.toISOString(), to: to.toISOString() };
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Booking[]>(`/api/location/my-bookings?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`);
      setBookings(data);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not load bookings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const cancel = async (sessionId: string) => {
    const previous = bookings;
    setBookings((current) => current.filter((entry) => entry.sessionId !== sessionId));
    setNotice(null);
    try {
      await apiFetch(`/api/location/sessions/${sessionId}/cancel-booking`, { method: 'POST' });
      setNotice('Booking canceled.');
    } catch (error) {
      setBookings(previous);
      setNotice(error instanceof Error ? error.message : 'Could not cancel booking.');
    }
  };

  return (
    <main className="mx-auto max-w-4xl space-y-5 p-6">
      <header className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">My Bookings</h1>
            <p className="text-sm text-slate-600">Upcoming classes for your active location.</p>
          </div>
          <SupportHelpButton />
        </div>
        {notice ? <p className="mt-2 text-sm text-amber-600">{notice}</p> : null}
      </header>
      <section className="space-y-3">
        {loading ? Array.from({ length: 3 }).map((_, index) => <Skeleton key={`bookings-loading-${index}`} className="h-16 rounded-lg" />) : null}
        {!loading && bookings.length === 0 ? (
          <EmptyState
            title="No bookings yet"
            description="Book your first class to start building your workout streak."
            actions={<Link href="/schedule" className="button">Browse classes</Link>}
          />
        ) : null}
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
