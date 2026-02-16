import { Suspense } from 'react';
import { JoinClient } from '@/app/join/join-client';
import { getPublicLocationBySlug } from '@/src/lib/sites';

export default async function SiteJoinPage({ params }: { params: { slug: string } }) {
  const data = await getPublicLocationBySlug(params.slug);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-4 px-6">
      <p className="text-sm text-slate-300">{data.location.displayName ?? data.location.name}</p>
      <Suspense fallback={null}>
        <JoinClient />
      </Suspense>
    </main>
  );
}
