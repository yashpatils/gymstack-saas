import { apiFetch } from './apiFetch';

export type DeveloperApiKey = {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

export type WebhookDelivery = {
  id: string;
  eventType: string;
  responseStatus: number | null;
  attemptCount: number;
  createdAt: string;
};

export type WebhookEndpoint = {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  deliveries: WebhookDelivery[];
};

export async function listApiKeys() {
  return apiFetch<DeveloperApiKey[]>('/api/developer/api-keys', { method: 'GET', cache: 'no-store' });
}

export async function createApiKey(name: string) {
  return apiFetch<{ id: string; name: string; key: string }>('/api/developer/api-keys', { method: 'POST', body: { name } });
}

export async function revokeApiKey(id: string) {
  return apiFetch<void>(`/api/developer/api-keys/${id}/revoke`, { method: 'POST' });
}

export async function listWebhooks() {
  return apiFetch<{ data: WebhookEndpoint[]; total: number; page: number; pageSize: number }>('/api/developer/webhooks', { method: 'GET', cache: 'no-store' });
}

export async function createWebhook(url: string, events: string[]) {
  return apiFetch<{ id: string; secret: string }>('/api/developer/webhooks', { method: 'POST', body: { url, events } });
}

export async function retryWebhookDelivery(deliveryId: string) {
  return apiFetch<void>(`/api/developer/webhooks/deliveries/${deliveryId}/retry`, { method: 'POST' });
}
