import { apiFetch } from './apiFetch';

export type AuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  createdAt: string;
  user?: {
    id: string;
    email: string;
  } | null;
};

export async function listAuditLogs(limit = 50): Promise<AuditLog[]> {
  return apiFetch<AuditLog[]>(`/api/audit?limit=${limit}`, { method: 'GET', cache: 'no-store' });
}
