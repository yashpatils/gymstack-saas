'use client';

import { useEffect } from 'react';
import { ErrorState } from '../src/components/ErrorState';

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function RootError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorState
      title="We hit an unexpected error."
      message="Please retry. If this continues, share the request ID with support so we can investigate quickly."
      requestId={error.digest}
      retry={reset}
    />
  );
}
