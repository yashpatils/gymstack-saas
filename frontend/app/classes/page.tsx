'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../src/lib/apiFetch';
import { EmptyState, Skeleton } from '../components/ui';
import { SupportHelpButton } from '../../src/components/SupportHelpButton';

type ClassTemplate = {
  id: string;
  title: string;
  description: string | null;
  coachUserId: string | null;
  capacity: number;
  isActive: boolean;
};

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassTemplate[]>([]);
  const [title, setTitle] = useState('');
  const [capacity, setCapacity] = useState(20);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const result = await apiFetch<ClassTemplate[]>('/api/location/classes');
      setClasses(result);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not load classes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setNotice(null);
    try {
      await apiFetch('/api/location/classes', {
        method: 'POST',
        body: { title, capacity },
      });
      setTitle('');
      setCapacity(20);
      setNotice('Class template created.');
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not create class template.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Class Templates</h1>
            <p className="mt-1 text-sm text-slate-600">Create reusable classes for this location schedule.</p>
          </div>
          <SupportHelpButton />
        </div>
        <form className="mt-4 grid gap-3 md:grid-cols-3" onSubmit={onCreate}>
          <input className="rounded-lg border px-3 py-2" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Class title" required />
          <input className="rounded-lg border px-3 py-2" type="number" min={1} value={capacity} onChange={(event) => setCapacity(Number(event.target.value))} required />
          <button className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white" type="submit" disabled={submitting}>{submitting ? 'Creating…' : 'Create Class'}</button>
        </form>
        {notice ? <p className="mt-3 text-sm text-amber-700">{notice}</p> : null}
      </section>

      <section className="grid gap-4">
        {loading ? Array.from({ length: 3 }).map((_, index) => <Skeleton key={`class-loading-${index}`} className="h-24 rounded-xl" />) : null}
        {!loading && classes.length === 0 ? (
          <EmptyState
            title="No classes yet"
            description="Create your first class template to start publishing sessions."
            actions={<Link href="/schedule" className="button">Go to schedule</Link>}
          />
        ) : null}
        {classes.map((entry) => (
          <article key={entry.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">{entry.title}</h2>
            <p className="text-sm text-slate-500">Capacity {entry.capacity} · {entry.isActive ? 'Active' : 'Inactive'}</p>
            {entry.description ? <p className="mt-2 text-sm text-slate-700">{entry.description}</p> : null}
          </article>
        ))}
      </section>
    </main>
  );
}
