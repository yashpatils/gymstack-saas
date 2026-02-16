export const dynamic = 'force-dynamic';
import { LocationShell } from '@/app/components/location-shell';
import { getPublicLocationBySlug } from '@/src/lib/sites';

export default async function SiteLandingPage({ params }: { params: { slug: string } }) {
  const data = await getPublicLocationBySlug(params.slug);
  return (
    <LocationShell
      title={data.location.displayName ?? data.location.name}
      subtitle={data.location.address ?? null}
      logoUrl={data.branding.logoUrl ?? null}
      primaryColor={data.branding.primaryColor ?? null}
      accentGradient={data.branding.accentGradient ?? null}
      heroTitle={data.branding.heroTitle ?? null}
      heroSubtitle={data.branding.heroSubtitle ?? null}
      loginHref={`/_sites/${params.slug}/login`}
      joinHref={`/_sites/${params.slug}/join`}
      whiteLabelEnabled={data.tenant.whiteLabelEnabled}
    />
  );
}
