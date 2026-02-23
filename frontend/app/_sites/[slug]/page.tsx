import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

type PublicGymProfile = {
  slug: string;
  displayName: string;
  heroTitle: string | null;
  heroSubtitle: string | null;
  address: string | null;
  timezone: string;
  contact: {
    email: string | null;
    phone: string | null;
  };
};

async function fetchPublicGymProfile(slug: string): Promise<PublicGymProfile> {
  const headerStore = await headers();
  const host = headerStore.get('host');

  if (!host) {
    notFound();
  }

  const proto = headerStore.get('x-forwarded-proto') ?? 'http';
  const endpoint = `${proto}://${host}/api/public/gyms/${encodeURIComponent(slug)}`;

  const response = await fetch(endpoint, {
    next: { revalidate: 120 },
    headers: { host },
  });

  if (response.status === 404) {
    notFound();
  }

  if (!response.ok) {
    throw new Error(`Unable to load public gym profile (${response.status})`);
  }

  return (await response.json()) as PublicGymProfile;
}

export default async function SiteLandingPage({ params }: { params: { slug: string } }) {
  const gym = await fetchPublicGymProfile(params.slug);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-12">
      <section className="w-full rounded-3xl border border-white/10 bg-slate-900/80 p-10 shadow-2xl">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-300">{gym.displayName}</p>
        <h1 className="mt-3 text-4xl font-semibold text-white sm:text-5xl">{gym.heroTitle ?? gym.displayName}</h1>
        <p className="mt-4 max-w-2xl text-base text-slate-300 sm:text-lg">
          {gym.heroSubtitle ?? 'Train with us. Book classes, meet coaches, and level up your fitness goals.'}
        </p>

        <div className="mt-8 grid gap-4 text-sm text-slate-200 sm:grid-cols-2">
          <div className="rounded-2xl bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Address</p>
            <p className="mt-1">{gym.address ?? 'Address will be published soon.'}</p>
          </div>
          <div className="rounded-2xl bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Contact</p>
            <p className="mt-1">{gym.contact.email ?? 'Email unavailable'}</p>
            <p>{gym.contact.phone ?? 'Phone unavailable'}</p>
            <p className="mt-1 text-xs text-slate-400">Timezone: {gym.timezone}</p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={`/_sites/${gym.slug}/join`} className="button">
            Join now
          </Link>
          <Link href={`/_sites/${gym.slug}/login`} className="button secondary">
            Member login
          </Link>
        </div>
      </section>
    </main>
  );
}
