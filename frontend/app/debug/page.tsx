'use client';

import { useState } from 'react';
import { apiFetch } from '../lib/api';

export default function DebugPage() {
  const [result, setResult] = useState<string>('Not tested yet');
  const [loading, setLoading] = useState(false);

  const testBackend = async () => {
    setLoading(true);
    setResult('Testing...');

    try {
      const data = await apiFetch<{ status: string }>('/health');
      setResult(`Success: ${JSON.stringify(data)}`);
    } catch (error) {
      setResult(
        `Failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-4 text-2xl font-semibold">Frontend API Debug</h1>
      <p className="mb-2">
        <strong>NEXT_PUBLIC_API_URL:</strong>{' '}
        {process.env.NEXT_PUBLIC_API_URL ?? 'Unset'}
      </p>
      <button
        type="button"
        onClick={testBackend}
        disabled={loading}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
      >
        {loading ? 'Testing...' : 'Test backend'}
      </button>
      <pre className="mt-4 whitespace-pre-wrap rounded bg-gray-100 p-3 text-sm">
        {result}
      </pre>
    </main>
  );
}
