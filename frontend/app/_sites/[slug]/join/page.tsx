import { Suspense } from 'react';
import { JoinClient } from '@/app/join/join-client';

export default function SiteJoinPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6">
      <Suspense fallback={null}>
        <JoinClient />
      </Suspense>
    </main>
  );
}
