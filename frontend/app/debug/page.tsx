'use client';

import { useState } from 'react';
import { apiFetch, buildApiUrl } from '@/src/lib/apiFetch';

type DebugResult = {
  label: string;
  ok: boolean;
  payload: unknown;
};

export default function DebugPage() {
  const [result, setResult] = useState<DebugResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runTest = async (label: string, path: string) => {
    const finalUrl = buildApiUrl(path);
    console.log(`[debug] Request URL (${label}): ${finalUrl}`);

    setLoading(true);
    try {
      const data = await apiFetch<unknown>(path);
      setResult({ label, ok: true, payload: data });
    } catch (error) {
      setResult({
        label,
        ok: false,
        payload: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-4 text-2xl font-semibold">Frontend API Debug</h1>
      <p className="mb-4">
        <strong>NEXT_PUBLIC_API_URL:</strong>{' '}
        {process.env.NEXT_PUBLIC_API_URL ?? 'Unset'}
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => runTest('health', '/api/health')}
          disabled={loading}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
        >
          Test /api/health
        </button>
        <button
          type="button"
          onClick={() => runTest('auth me', '/api/auth/me')}
          disabled={loading}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
        >
          Test /api/auth/me
        </button>
        <button
          type="button"
          onClick={() => runTest('gyms', '/gyms')}
          disabled={loading}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
        >
          Test /gyms
        </button>
      </div>

      <pre className="mt-4 whitespace-pre-wrap rounded bg-gray-100 p-3 text-sm">
        {result
          ? `${result.label} (${result.ok ? 'success' : 'error'})\n${JSON.stringify(result.payload, null, 2)}`
          : 'Not tested yet'}
      </pre>
    </main>
  );
}
