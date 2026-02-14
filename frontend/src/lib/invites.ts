import { apiFetch } from './apiFetch';

export type CreateInvitePayload = {
  locationId: string;
  role: 'GYM_STAFF_COACH' | 'CLIENT';
  email?: string;
  expiresInHours?: number;
};

export async function createInvite(payload: CreateInvitePayload): Promise<{ token: string; inviteUrl: string; role: 'GYM_STAFF_COACH' | 'CLIENT'; tenantId: string; locationId: string; expiresAt: string }> {
  return apiFetch('/api/invites', {
    method: 'POST',
    body: payload,
  });
}
