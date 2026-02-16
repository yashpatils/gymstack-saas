import { notFound } from 'next/navigation';
import { GymLoginForm } from '@/app/components/gym-login-form';
import { getPublicLocationByHost } from '@/src/lib/sites';

export default async function CustomLoginPage({ params }: { params: { host: string } }) {
  const host = decodeURIComponent(params.host);
  const data = await getPublicLocationByHost(host);

  if (!data.location || !data.tenant) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-4 px-6">
      <p className="text-sm text-slate-300">{data.location.displayName ?? data.location.name}</p>
      <GymLoginForm tenantId={data.tenant.id} locationId={data.location.id} />
    </main>
  );
}
