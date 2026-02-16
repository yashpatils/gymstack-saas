import { apiFetch } from './apiFetch';

export type CreateInvitePayload = {
  tenantId: string;
  locationId: string;
  role: 'GYM_STAFF_COACH' | 'CLIENT';
  email?: string;
  expiresInDays?: number;
};

export async function createInvite(payload: CreateInvitePayload): Promise<{ inviteId: string; token: string; tokenPrefix: string; inviteUrl: string; role: 'GYM_STAFF_COACH' | 'CLIENT'; tenantId: string; locationId: string; expiresAt: string }> {
  return apiFetch('/api/invites', {
    method: 'POST',
    body: payload,
  });
}
