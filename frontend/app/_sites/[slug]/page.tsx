export const dynamic = 'force-dynamic';

import { LocationShell } from '@/src/components/location/LocationShell';
import { getLocationByHost } from '@/src/lib/publicApi';

export default async function SiteLandingPage() {
  const data = await getLocationByHost();

  if (data.tenantDisabled) {
    return (
      <LocationShell
        title="Temporarily unavailable"
        subtitle="This tenant is temporarily unavailable. Please contact support."
        logoUrl={null}
        primaryColor={null}
        accentGradient={null}
        whiteLabelEnabled={false}
      />
    );
  }

  if (!data.location || !data.tenant) {
    return (
      <LocationShell
        title="Location not found"
        subtitle="This subdomain is not configured yet."
        logoUrl={null}
        primaryColor={null}
        accentGradient={null}
        whiteLabelEnabled={false}
      />
    );
  }

  const location = data.location;
  const title = location.heroTitle ?? location.displayName;
  const subtitle = location.heroSubtitle ?? 'Sign in or join with your invite.';

  return (
    <LocationShell
      title={title}
      subtitle={subtitle}
      logoUrl={location.logoUrl}
      primaryColor={location.primaryColor}
      accentGradient={location.accentGradient}
      whiteLabelEnabled={data.tenant.whiteLabelEnabled}
    />
  );
}
