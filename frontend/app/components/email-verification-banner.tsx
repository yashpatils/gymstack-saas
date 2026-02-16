'use client';

import { useState } from 'react';
import Link from 'next/link';
import { resendVerification } from '@/src/lib/auth';
import { useAuth } from '@/src/providers/AuthProvider';

export function EmailVerificationBanner() {
  const { user } = useAuth();
  const [message, setMessage] = useState<string | null>(null);

  if (!user || user.emailVerified) {
    return null;
  }

  return (
    <div className="mb-4 rounded border border-amber-500/60 bg-amber-400/10 p-3 text-sm text-amber-100">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">Verify your email to unlock full access.</p>
        <button
          type="button"
          className="button secondary"
          onClick={async () => {
            const result = await resendVerification(user.email);
            setMessage(result.emailDeliveryWarning ?? result.message);
          }}
        >
          Resend verification
        </button>
        <Link href="/verify-email" className="text-xs font-semibold underline underline-offset-2">
          Open verification page
        </Link>
      </div>
      {message ? <p className="mt-2 text-xs text-amber-200">{message}</p> : null}
    </div>
  );
}
