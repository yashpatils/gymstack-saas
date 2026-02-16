import { Suspense } from 'react';
import { JoinClient } from '@/app/join/join-client';
import { getPublicLocationBySlug } from '@/src/lib/sites';
import type { SlugPageProps } from '@/src/lib/pageProps';

export default async function SiteJoinPage({ params }: SlugPageProps) {
  const data = await getPublicLocationBySlug(params.slug);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-4 px-6">
      <p className="text-sm text-slate-300">{data.location.displayName}</p>
      <Suspense fallback={null}>
        <JoinClient />
      </Suspense>
    </main>
  );
}
