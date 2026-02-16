import { Suspense } from 'react';
import { JoinClient } from './join-client';

export default function JoinPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-6">
      <Suspense fallback={null}>
        <JoinClient />
      </Suspense>
    </main>
  );
}
