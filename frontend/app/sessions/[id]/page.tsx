'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../../src/lib/apiFetch';

type RosterBooking = {
  id: string;
  status: 'BOOKED' | 'CHECKED_IN';
  user: { id: string; email: string };
};

type RosterResponse = {
  id: string;
  capacity: number;
  bookedCount: number;
  classTemplate: { title: string };
  bookings: RosterBooking[];
};

export default function SessionRosterPage() {
  const params = useParams<{ id: string }>();
  const [roster, setRoster] = useState<RosterResponse | null>(null);

  const load = async () => {
    const data = await apiFetch<RosterResponse>(`/api/location/sessions/${params.id}/roster`);
    setRoster(data);
  };

  useEffect(() => {
    void load();
  }, [params.id]);

  const checkIn = async (userId: string) => {
    await apiFetch(`/api/location/sessions/${params.id}/check-in`, { method: 'POST', body: { userId } });
    await load();
  };

  if (!roster) {
    return <main className="p-6 text-sm text-slate-600">Loading roster…</main>;
  }

  return (
    <main className="mx-auto max-w-3xl space-y-5 p-6">
      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold">{roster.classTemplate.title} Roster</h1>
        <p className="text-sm text-slate-600">Capacity {roster.bookedCount}/{roster.capacity}</p>
      </section>
      <section className="space-y-2">
        {roster.bookings.map((booking) => (
          <article key={booking.id} className="flex items-center justify-between rounded-lg border bg-white px-4 py-3">
            <div>
              <p className="font-medium text-slate-900">{booking.user.email}</p>
              <p className="text-xs text-slate-500">{booking.status === 'CHECKED_IN' ? 'Checked in' : 'Booked'}</p>
            </div>
            {booking.status !== 'CHECKED_IN' ? (
              <button className="rounded-lg border px-3 py-1 text-sm" onClick={() => void checkIn(booking.user.id)}>Check in</button>
            ) : null}
          </article>
        ))}
      </section>
    </main>
  );
}
