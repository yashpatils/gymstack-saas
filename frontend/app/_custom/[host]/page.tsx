export const dynamic = 'force-dynamic';
import { GymLanding } from '@/app/components/gym-landing';
import { resolvePublicSite } from '@/src/lib/sites';

export default async function CustomDomainLanding({ params }: { params: { host: string } }) {
  const host = decodeURIComponent(params.host);
  const site = await resolvePublicSite(host);

  if (site.kind === 'location' && site.location) {
    return (
      <GymLanding
        title={site.location.displayName ?? site.location.name}
        subtitle={site.location.address ?? null}
        loginHref={`/_custom/${encodeURIComponent(host)}/login`}
        joinHref={`/_custom/${encodeURIComponent(host)}/join`}
      />
    );
  }

  return (
    <GymLanding
      title={site.tenant.name}
      subtitle="Select your location after login"
      loginHref={`/_custom/${encodeURIComponent(host)}/login`}
      joinHref={`/_custom/${encodeURIComponent(host)}/join`}
    />
  );
}
