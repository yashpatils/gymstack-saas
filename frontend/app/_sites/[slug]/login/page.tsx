import { headers } from 'next/headers';
import { GymLoginForm } from '@/app/components/gym-login-form';
import { getPublicLocationByHost, getPublicLocationBySlug } from '@/src/lib/sites';

export default async function SiteLoginPage({ params }: { params: { slug: string } }) {
  const hostHeader = headers().get('host');
  const host = hostHeader?.split(':')[0] ?? null;
  const data = host
    ? await getPublicLocationByHost(host).catch(() => getPublicLocationBySlug(params.slug))
    : await getPublicLocationBySlug(params.slug);

  const tenantId = 'tenantId' in data ? data.tenantId : data.tenant?.id;

  if (!tenantId) {
    throw new Error('Unable to resolve tenant for login page');
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-4 px-6">
      <p className="text-sm text-slate-300">{data.location.displayName ?? data.location.name}</p>
      <GymLoginForm tenantId={tenantId} locationId={data.location.id} />
    </main>
  );
}
