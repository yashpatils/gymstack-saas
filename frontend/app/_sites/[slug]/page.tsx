export const dynamic = 'force-dynamic';
import { headers } from 'next/headers';
import { LocationShell } from '@/app/components/location-shell';
import { getPublicLocationByHost, getPublicLocationBySlug } from '@/src/lib/sites';

export default async function SiteLandingPage({ params }: { params: { slug: string } }) {
  const hostHeader = headers().get('host');
  const host = hostHeader?.split(':')[0] ?? null;
  const data = host
    ? await getPublicLocationByHost(host).catch(() => getPublicLocationBySlug(params.slug))
    : await getPublicLocationBySlug(params.slug);

  const fallback = data.location && data.tenant ? null : await getPublicLocationBySlug(params.slug);
  const location = data.location ?? fallback?.location;
  const tenant = data.tenant ?? fallback?.tenant;

  if (!location || !tenant) {
    throw new Error('Unable to resolve public site location');
  }

  return (
    <LocationShell
      title={location.displayName ?? location.name}
      subtitle={location.address ?? null}
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
