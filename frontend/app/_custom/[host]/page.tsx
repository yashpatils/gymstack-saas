import { GymLanding } from '@/app/components/gym-landing';
import { resolvePublicSite } from '@/src/lib/sites';
import type { HostPageProps } from '@/src/lib/pageProps';

export const dynamic = 'force-dynamic';

function resolveAppUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_WEB_URL;
  return configuredUrl ? configuredUrl.replace(/\/$/, '') : '';
}

export default async function CustomDomainLandingPage({ params }: HostPageProps) {
  const host = decodeURIComponent(params.host);
  const data = await resolvePublicSite(host).catch(() => null);

  if (!data || data.kind !== 'location' || !data.location) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6">
        <section className="w-full rounded-2xl border border-white/15 bg-slate-900/80 p-8">
          <h1 className="text-3xl font-semibold text-white">Site not found</h1>
          <p className="mt-2 text-slate-300">This domain is not connected to a Gym Stack location yet.</p>
        </section>
      </main>
    );
  }

  const baseUrl = resolveAppUrl();
  const loginHref = baseUrl ? `${baseUrl}/login` : '/login';
  const joinHref = baseUrl ? `${baseUrl}/join` : '/login';

  return (
    <GymLanding
      title={data.branding.heroTitle ?? data.location.displayName ?? data.location.name}
      subtitle={data.branding.heroSubtitle ?? null}
      loginHref={loginHref}
      joinHref={joinHref}
    />
  );
}
