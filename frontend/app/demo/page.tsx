"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../src/lib/apiFetch';
import { applyOAuthToken } from '../../src/lib/auth';

export default function DemoPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void (async () => {
      try {
        const data = await apiFetch<{ accessToken: string }>('/api/demo/access', { method: 'GET' });
        applyOAuthToken(data.accessToken);
        router.replace('/platform');
      } catch (demoError) {
        setError(demoError instanceof Error ? demoError.message : 'Unable to load demo');
      }
    })();
  }, [router]);

  return <main className="p-10 text-center text-slate-200">{error ?? 'Starting demo workspace… Demo mode — data resets daily.'}</main>;
}
