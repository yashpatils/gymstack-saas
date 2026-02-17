import { apiFetch } from './apiFetch';

export type AuditLog = {
  id: string;
  actorType?: 'USER' | 'ADMIN' | 'SYSTEM';
  actorEmail?: string | null;
  actorRole?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  tenantId?: string | null;
  locationId?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  actorUser?: {
    id: string;
    email: string;
  } | null;
};

export type AuditFilters = {
  tenantId?: string;
  action?: string;
  actor?: string;
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string;
};

export type AuditPage = {
  items: AuditLog[];
  nextCursor: string | null;
};

function toQueryString(filters: AuditFilters): string {
  const params = new URLSearchParams();
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.cursor) params.set('cursor', filters.cursor);
  if (filters.tenantId) params.set('tenantId', filters.tenantId);
  if (filters.action) params.set('action', filters.action);
  if (filters.actor) params.set('actor', filters.actor);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  const query = params.toString();
  return query ? `?${query}` : '';
}

export async function listAuditLogs(filters: AuditFilters = {}): Promise<AuditPage> {
  return apiFetch<AuditPage>(`/api/audit${toQueryString(filters)}`, { method: 'GET', cache: 'no-store' });
}

export async function listAdminAuditLogs(filters: AuditFilters = {}): Promise<AuditPage> {
  return apiFetch<AuditPage>(`/api/admin/audit${toQueryString(filters)}`, { method: 'GET', cache: 'no-store' });
}
