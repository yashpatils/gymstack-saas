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

  return (
    <LocationShell
      title={data.location.displayName ?? data.location.name}
      subtitle={data.location.address ?? null}
      logoUrl={data.location.logoUrl ?? null}
      primaryColor={data.location.primaryColor ?? null}
      accentGradient={data.location.accentGradient ?? null}
      heroTitle={data.location.heroTitle ?? null}
      heroSubtitle={data.location.heroSubtitle ?? null}
      loginHref="/login"
      joinHref="/join?token="
      whiteLabelEnabled={data.tenant.whiteLabelEnabled}
    />
  );
}
