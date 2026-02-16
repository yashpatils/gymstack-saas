import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { JoinClient } from '@/app/join/join-client';
import { getPublicLocationByHost } from '@/src/lib/sites';

export default async function CustomJoinPage({ params }: { params: { host: string } }) {
  const host = decodeURIComponent(params.host);
  const data = await getPublicLocationByHost(host);

  if (!data.location) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-4 px-6">
      <p className="text-sm text-slate-300">{data.location.displayName ?? data.location.slug}</p>
      <Suspense fallback={null}>
        <JoinClient />
      </Suspense>
    </main>
  );
}
