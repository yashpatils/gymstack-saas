import { notFound } from 'next/navigation';
import { GymLanding } from '@/app/components/gym-landing';
import { getMainSiteUrl } from '@/src/lib/domainConfig';
import { getPublicLocationBySlug } from '@/src/lib/sites';
import type { SlugPageProps } from '@/src/lib/pageProps';

export const dynamic = 'force-dynamic';

export default async function SiteLandingPage({ params }: SlugPageProps) {
  const data = await getPublicLocationBySlug(params.slug).catch(() => null);

  if (!data || !data.location) {
    notFound();
  }

  if (data.tenantDisabled) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6">
        <section className="w-full rounded-2xl border border-white/15 bg-slate-900/80 p-8">
          <h1 className="text-3xl font-semibold text-white">Location temporarily unavailable</h1>
          <p className="mt-2 text-slate-300">This location is currently disabled. Please contact your gym administrator for help.</p>
        </section>
      </main>
    );
  }

  const title = data.branding?.heroTitle ?? data.location.displayName ?? data.location.name ?? data.location.slug;
  const loginHref = getMainSiteUrl('/login');
  const joinHref = getMainSiteUrl('/join');

  return (
    <GymLanding
      title={title}
      subtitle={data.branding?.heroSubtitle ?? null}
      loginHref={loginHref}
      joinHref={joinHref}
    />
  );
}
