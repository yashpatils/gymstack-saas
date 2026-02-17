"use client";
import { FormEvent, useState } from 'react';
import { apiFetch } from '../../src/lib/apiFetch';

export default function BookDemoPage() {
  const [status, setStatus] = useState<string>('');
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    await apiFetch('/api/leads', { method: 'POST', body: JSON.stringify({ name: String(fd.get('name') ?? ''), email: String(fd.get('email') ?? ''), gymName: String(fd.get('gymName') ?? ''), size: String(fd.get('size') ?? '') }), headers: { 'Content-Type': 'application/json' } });
    setStatus('Thanks! We will contact you.');
  }

  return <main className="mx-auto max-w-xl space-y-3 p-8"><h1 className="text-2xl">Book a demo</h1><form className="space-y-2" onSubmit={(event) => void onSubmit(event)}><input className="input" name="name" placeholder="Name" required /><input className="input" type="email" name="email" placeholder="Email" required /><input className="input" name="gymName" placeholder="Gym name" required /><input className="input" name="size" placeholder="Gym size" required /><button className="button" type="submit">Book a demo</button></form><p>{status}</p></main>;
}
