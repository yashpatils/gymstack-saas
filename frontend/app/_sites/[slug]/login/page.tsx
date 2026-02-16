import { headers } from 'next/headers';
import { GymLoginForm } from '@/app/components/gym-login-form';
import { getPublicLocationByHost, getPublicLocationBySlug } from '@/src/lib/sites';

type SiteLoginData =
  | Awaited<ReturnType<typeof getPublicLocationBySlug>>
  | Awaited<ReturnType<typeof getPublicLocationByHost>>;

function getTenantId(data: SiteLoginData): string | null {
  if ('tenantId' in data && typeof data.tenantId === 'string') {
    return data.tenantId;
  }

  if (data.tenant && typeof data.tenant.id === 'string') {
    return data.tenant.id;
  }

  return null;
}

export default async function SiteLoginPage({ params }: { params: { slug: string } }) {
  const hostHeader = headers().get('host');
  const host = hostHeader?.split(':')[0] ?? null;
  const data = host
    ? await getPublicLocationByHost(host).catch(() => getPublicLocationBySlug(params.slug))
    : await getPublicLocationBySlug(params.slug);

  const tenantId = getTenantId(data);

  if (!tenantId) {
    throw new Error('Unable to resolve tenant for login page');
  }

  if (!data.location) {
    throw new Error('Unable to resolve location for login page');
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-4 px-6">
      <p className="text-sm text-slate-300">{data.location.displayName ?? data.location.name}</p>
      <GymLoginForm tenantId={tenantId} locationId={data.location.id} />
    </main>
  );
}
