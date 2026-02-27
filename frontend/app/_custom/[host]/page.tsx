import { notFound } from 'next/navigation';
import { GymLanding } from '@/app/components/gym-landing';
import { getMainSiteUrl } from '@/src/lib/domainConfig';
import { resolvePublicSite } from '@/src/lib/sites';
import type { HostPageProps } from '@/src/lib/pageProps';

export const dynamic = 'force-dynamic';

export default async function CustomDomainLandingPage({ params }: HostPageProps) {
  const host = decodeURIComponent(params.host);
  const data = await resolvePublicSite(host).catch(() => null);

  if (!data || data.kind !== 'location' || !data.location) {
    notFound();
  }

  const loginHref = getMainSiteUrl('/login');
  const joinHref = getMainSiteUrl('/join');

  return (
    <GymLanding
      title={data.branding.heroTitle ?? data.location.displayName ?? data.location.name}
      subtitle={data.branding.heroSubtitle ?? null}
      loginHref={loginHref}
      joinHref={joinHref}
    />
  );
}
