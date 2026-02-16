export const dynamic = 'force-dynamic';
import { headers } from 'next/headers';
import { LocationShell } from '@/app/components/location-shell';
import { getPublicLocationByHost, getPublicLocationBySlug } from '@/src/lib/sites';
import type { SlugPageProps } from '@/src/lib/pageProps';

export default async function SiteLandingPage({ params }: SlugPageProps) {
  const hostHeader = headers().get('host');
  const host = hostHeader?.split(':')[0] ?? null;

  const hostData = host ? await getPublicLocationByHost(host).catch(() => null) : null;
  const data = hostData?.location && hostData.tenant ? hostData : await getPublicLocationBySlug(params.slug);

  const fallback = data.location && data.tenant ? null : await getPublicLocationBySlug(params.slug);
  const location = data.location ?? fallback?.location;
  const tenant = data.tenant ?? fallback?.tenant;

  if (!location || !tenant) {
    throw new Error('Unable to resolve public site location');
  }

  const title = location.heroTitle ?? location.displayName ?? 'Welcome';
  const subtitle = location.heroSubtitle ?? 'Sign in or join with your invite';

  return (
    <LocationShell
      title={title}
      subtitle={subtitle}
      logoUrl={location.logoUrl ?? null}
      primaryColor={location.primaryColor ?? null}
      accentGradient={location.accentGradient ?? null}
      heroTitle={location.heroTitle ?? null}
      heroSubtitle={location.heroSubtitle ?? null}
      loginHref="/login"
      joinHref="/join?token="
      whiteLabelEnabled={tenant.whiteLabelEnabled}
    />
  );
}
