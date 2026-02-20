'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../../src/lib/apiFetch';
import { EmptyState, Skeleton } from '../../components/ui';
import { SupportHelpButton } from '../../../src/components/SupportHelpButton';

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
  const [notice, setNotice] = useState<string | null>(null);

  const load = async () => {
    try {
      const data = await apiFetch<RosterResponse>(`/api/location/sessions/${params.id}/roster`);
      setRoster(data);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Failed to load roster.');
    }
  };

  useEffect(() => {
    void load();
  }, [params.id]);

  const checkIn = async (userId: string) => {
    if (!roster) {
      return;
    }

    const previous = roster;
    setRoster({
      ...roster,
      bookings: roster.bookings.map((booking) =>
        booking.user.id === userId ? { ...booking, status: 'CHECKED_IN' } : booking,
      ),
    });

    try {
      await apiFetch(`/api/location/sessions/${params.id}/check-in`, { method: 'POST', body: { userId } });
      setNotice('Client checked in.');
    } catch (error) {
      setRoster(previous);
      setNotice(error instanceof Error ? error.message : 'Check-in failed.');
    }
  };

  if (!roster) {
    return <main className="p-6"><Skeleton className="h-24 rounded-xl" /></main>;
  }

  return (
    <main className="mx-auto max-w-3xl space-y-5 p-6">
      <section className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{roster.classTemplate.title} Roster</h1>
            <p className="text-sm text-muted-foreground">Capacity {roster.bookedCount}/{roster.capacity}</p>
          </div>
          <SupportHelpButton />
        </div>
        {notice ? <p className="mt-2 text-sm text-muted-foreground">{notice}</p> : null}
      </section>
      <section className="space-y-2">
        {roster.bookings.length === 0 ? (
          <EmptyState title="No bookings for this session" description="Invite members to book this class from the schedule." />
        ) : null}
        {roster.bookings.map((booking) => (
          <article key={booking.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-card-foreground">
            <div>
              <p className="font-medium text-foreground">{booking.user.email}</p>
              <p className="text-xs text-muted-foreground">{booking.status === 'CHECKED_IN' ? 'Checked in' : 'Booked'}</p>
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
