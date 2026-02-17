import { apiFetch } from './apiFetch';

export type TenantMember = {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  role: 'TENANT_OWNER' | 'TENANT_LOCATION_ADMIN' | 'GYM_STAFF_COACH' | 'CLIENT';
  status: 'ACTIVE' | 'INVITED' | 'DISABLED';
  locationId: string | null;
  locationName: string | null;
  createdAt: string;
};

export type TenantInvite = {
  id: string;
  role: 'TENANT_LOCATION_ADMIN' | 'GYM_STAFF_COACH' | 'CLIENT';
  email: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';
  tokenPrefix: string;
  expiresAt: string;
  createdAt: string;
};

export function listTenantMembers() { return apiFetch<TenantMember[]>('/api/tenant/members'); }
export function updateTenantMember(memberId: string, payload: { role?: TenantMember['role']; locationId?: string | null; remove?: boolean }) {
  return apiFetch<{ ok: true }>(`/api/tenant/members/${memberId}`, { method: 'PATCH', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
}
export function listTenantInvites() { return apiFetch<TenantInvite[]>('/api/tenant/invites'); }
export function createTenantInvite(payload: { tenantId: string; role: TenantInvite['role']; locationId?: string; email?: string }) {
  return apiFetch<{ inviteLink: string }>('/api/tenant/invites', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
}
export function revokeTenantInvite(id: string) { return apiFetch<{ ok: true }>(`/api/tenant/invites/${id}/revoke`, { method: 'POST' }); }
