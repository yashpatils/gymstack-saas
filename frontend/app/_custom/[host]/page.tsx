export const dynamic = 'force-dynamic';
import { notFound } from 'next/navigation';
import { LocationShell } from '@/app/components/location-shell';
import { getPublicLocationByHost } from '@/src/lib/sites';
import type { HostPageProps } from '@/src/lib/pageProps';

export default async function CustomDomainLanding({ params }: HostPageProps) {
  const host = decodeURIComponent(params.host);
  const data = await getPublicLocationByHost(host);

  if (!data.location || !data.tenant) {
    notFound();
  }

  return (
    <LocationShell
      title={data.location.displayName ?? data.location.slug}
      subtitle={null}
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
