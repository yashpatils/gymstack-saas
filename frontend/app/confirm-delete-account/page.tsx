import { Suspense } from 'react';
import ConfirmDeleteAccountClient from './confirm-delete-account-client';

export default function ConfirmDeleteAccountPage() {
  return (
    <Suspense fallback={<main className="min-h-screen p-6 text-slate-200">Confirming deletion...</main>}>
      <ConfirmDeleteAccountClient />
    </Suspense>
  );
}
