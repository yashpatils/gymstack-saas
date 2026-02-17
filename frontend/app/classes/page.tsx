'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiFetch } from '../../src/lib/apiFetch';

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

  const load = async () => {
    setLoading(true);
    const result = await apiFetch<ClassTemplate[]>('/api/location/classes');
    setClasses(result);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const onCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await apiFetch('/api/location/classes', {
      method: 'POST',
      body: { title, capacity },
    });
    setTitle('');
    setCapacity(20);
    await load();
  };

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Class Templates</h1>
        <p className="mt-1 text-sm text-slate-600">Create reusable classes for this location schedule.</p>
        <form className="mt-4 grid gap-3 md:grid-cols-3" onSubmit={onCreate}>
          <input className="rounded-lg border px-3 py-2" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Class title" required />
          <input className="rounded-lg border px-3 py-2" type="number" min={1} value={capacity} onChange={(event) => setCapacity(Number(event.target.value))} required />
          <button className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white" type="submit">Create Class</button>
        </form>
      </section>

      <section className="grid gap-4">
        {loading && <p className="text-sm text-slate-600">Loading classes…</p>}
        {!loading && classes.length === 0 && <div className="rounded-xl border border-dashed p-8 text-center text-slate-500">No classes yet. Add your first template.</div>}
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
