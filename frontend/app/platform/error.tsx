'use client';

import { useEffect } from 'react';
import { ErrorState } from '../../src/components/ErrorState';

type PlatformErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function PlatformError({ error, reset }: PlatformErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorState
      title="Couldn&apos;t load this platform page."
      message="You can retry now or return to platform home. If this keeps happening, contact support with the request ID."
      requestId={error.digest}
      retry={reset}
      homeHref="/platform"
      homeLabel="Back to platform"
    />
  );
}
