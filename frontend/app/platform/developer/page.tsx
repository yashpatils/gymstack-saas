"use client";

import { useEffect, useState } from 'react';
import { createApiKey, createWebhook, listApiKeys, listWebhooks, retryWebhookDelivery, revokeApiKey, type DeveloperApiKey, type WebhookEndpoint } from '@/src/lib/developer';

const EVENT_OPTIONS = ['booking.created', 'booking.canceled', 'membership.created', 'membership.canceled', 'client.created', 'classSession.created'];

export default function DeveloperPage() {
  const [keys, setKeys] = useState<DeveloperApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<string[]>(['booking.created']);
  const [newKey, setNewKey] = useState<string | null>(null);

  async function load() {
    const [apiKeys, webhookRes] = await Promise.all([listApiKeys(), listWebhooks()]);
    setKeys(apiKeys);
    setWebhooks(webhookRes.data);
  }

  useEffect(() => { void load(); }, []);

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Developer</h1>

      <section className="rounded-xl border border-white/10 p-4">
        <h2 className="text-lg font-medium">API Keys</h2>
        <div className="mt-3 flex gap-2">
          <input className="rounded border px-3 py-2 text-black" value={name} onChange={(e) => setName(e.target.value)} placeholder="Key name" />
          <button className="button" onClick={async () => { const created = await createApiKey(name); setNewKey(created.key); setName(''); await load(); }} type="button">Create</button>
        </div>
        {newKey ? <p className="mt-2 text-sm text-amber-300">Copy now (shown once): <code>{newKey}</code></p> : null}
        <ul className="mt-3 space-y-2">
          {keys.map((key) => (
            <li key={key.id} className="flex items-center justify-between rounded border border-white/10 p-2 text-sm">
              <span>{key.name} · last used: {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : 'never'} · {key.revokedAt ? 'revoked' : 'active'}</span>
              {!key.revokedAt ? <button className="button secondary" onClick={async () => { await revokeApiKey(key.id); await load(); }} type="button">Revoke</button> : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-white/10 p-4">
        <h2 className="text-lg font-medium">Webhooks</h2>
        <div className="mt-3 space-y-2">
          <input className="w-full rounded border px-3 py-2 text-black" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/webhooks" />
          <div className="flex flex-wrap gap-2">
            {EVENT_OPTIONS.map((eventType) => (
              <label key={eventType} className="text-sm">
                <input
                  type="checkbox"
                  checked={events.includes(eventType)}
                  onChange={(e) => setEvents((prev) => e.target.checked ? [...prev, eventType] : prev.filter((item) => item !== eventType))}
                /> {eventType}
              </label>
            ))}
          </div>
          <button className="button" type="button" onClick={async () => { await createWebhook(url, events); setUrl(''); await load(); }}>Create endpoint</button>
        </div>
        <div className="mt-4 space-y-4">
          {webhooks.map((endpoint) => (
            <div key={endpoint.id} className="rounded border border-white/10 p-3">
              <p className="font-medium">{endpoint.url}</p>
              <p className="text-xs text-slate-300">{endpoint.events.join(', ')}</p>
              <ul className="mt-2 space-y-1">
                {endpoint.deliveries.map((delivery) => (
                  <li key={delivery.id} className="flex items-center justify-between text-xs">
                    <span>{delivery.eventType} · status {delivery.responseStatus ?? 'pending'} · attempts {delivery.attemptCount}</span>
                    <button className="button secondary" type="button" onClick={async () => { await retryWebhookDelivery(delivery.id); await load(); }}>Retry</button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
