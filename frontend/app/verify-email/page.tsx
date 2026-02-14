import { Suspense } from 'react';
import VerifyEmailClient from './verify-email-client';

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<main className="min-h-screen p-6 text-slate-200">Verifying...</main>}>
      <VerifyEmailClient />
    </Suspense>
  );
}
