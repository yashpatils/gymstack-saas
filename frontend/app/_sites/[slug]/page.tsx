export const dynamic = 'force-dynamic';
import { GymLanding } from '@/app/components/gym-landing';
import { getPublicLocationBySlug } from '@/src/lib/sites';

export default async function SiteLandingPage({ params }: { params: { slug: string } }) {
  const data = await getPublicLocationBySlug(params.slug);
  return (
    <GymLanding
      title={data.location.displayName ?? data.location.name}
      subtitle={data.location.address ?? null}
      loginHref={`/_sites/${params.slug}/login`}
      joinHref={`/_sites/${params.slug}/join`}
    />
  );
}
