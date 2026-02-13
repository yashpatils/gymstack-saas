import { Suspense } from 'react';
import { GymJoinForm } from '@/app/components/gym-join-form';

export default function CustomJoinPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6">
      <Suspense fallback={null}>
        <GymJoinForm />
      </Suspense>
    </main>
  );
}
