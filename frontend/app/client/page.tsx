import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { buildApiUrl } from '../../src/lib/apiFetch';

type ClientPortalResponse = {
  memberships: Array<{
    id: string;
    status: string;
    startAt: string;
    endAt: string | null;
    location: { id: string; name: string } | null;
    plan: { id: string; name: string; interval: string; priceCents: number | null } | null;
  }>;
  upcomingBookings: Array<{
    id: string;
    location: { id: string; name: string };
    classTitle: string;
    startsAt: string;
    endsAt: string;
  }>;
  planInfo: { id: string; name: string; interval: string; priceCents: number | null } | null;
};

async function getClientPortalData(): Promise<ClientPortalResponse> {
  const token = cookies().get('gymstack_token')?.value;
  if (!token) {
    redirect('/login?next=/client');
  }

  const response = await fetch(buildApiUrl('/api/client/me'), {
    method: 'GET',
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    redirect('/login?next=/client');
  }

  if (response.status === 403) {
    redirect('/platform');
  }

  if (!response.ok) {
    throw new Error(`Failed to load client portal (${response.status})`);
  }

  return response.json() as Promise<ClientPortalResponse>;
}

export default async function ClientPortalPage() {
  const data = await getClientPortalData();

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Client portal</h1>
        <p className="text-sm text-neutral-500">Your membership status, upcoming bookings, and profile plan details.</p>
      </header>

      <section className="rounded-xl border border-neutral-200 p-4">
        <h2 className="text-lg font-medium">Membership status</h2>
        <ul className="mt-3 space-y-2">
          {data.memberships.map((membership) => (
            <li key={membership.id} className="rounded-md border border-neutral-100 p-3 text-sm">
              <p className="font-medium">{membership.location?.name ?? 'Location'} · {membership.status}</p>
              <p className="text-neutral-500">Plan: {membership.plan?.name ?? 'No plan'} ({membership.plan?.interval ?? 'n/a'})</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-neutral-200 p-4">
        <h2 className="text-lg font-medium">Upcoming bookings</h2>
        {data.upcomingBookings.length === 0 ? <p className="mt-3 text-sm text-neutral-500">No upcoming bookings.</p> : (
          <ul className="mt-3 space-y-2">
            {data.upcomingBookings.map((booking) => (
              <li key={booking.id} className="rounded-md border border-neutral-100 p-3 text-sm">
                <p className="font-medium">{booking.classTitle}</p>
                <p className="text-neutral-500">{booking.location.name} · {new Date(booking.startsAt).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-neutral-200 p-4">
        <h2 className="text-lg font-medium">Profile plan info</h2>
        <p className="mt-2 text-sm text-neutral-500">
          {data.planInfo ? `${data.planInfo.name} (${data.planInfo.interval})` : 'No active plan information available.'}
        </p>
      </section>
    </main>
  );
}
