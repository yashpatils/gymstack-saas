import { apiFetch } from './apiFetch';
import { track } from './analytics';

export type CreateInvitePayload = {
  tenantId: string;
  locationId: string;
  role: 'GYM_STAFF_COACH' | 'CLIENT';
  email?: string;
  expiresInDays?: number;
};

export async function createInvite(payload: CreateInvitePayload): Promise<{ inviteId: string; token: string; tokenPrefix: string; inviteUrl: string; role: 'GYM_STAFF_COACH' | 'CLIENT'; tenantId: string; locationId: string; expiresAt: string }> {
  const result = await apiFetch<{ inviteId: string; token: string; tokenPrefix: string; inviteUrl: string; role: 'GYM_STAFF_COACH' | 'CLIENT'; tenantId: string; locationId: string; expiresAt: string }>('/api/invites', {
    method: 'POST',
    body: payload,
  });
  await track('invite_created', { role: payload.role });
  return result;
}
