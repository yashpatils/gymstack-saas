import { apiFetch } from './apiFetch';

export type CreateInvitePayload = {
  email: string;
  role: 'ADMIN' | 'OWNER' | 'USER';
};

export async function createInvite(payload: CreateInvitePayload): Promise<{ inviteLink: string }> {
  return apiFetch<{ inviteLink: string }>('/api/invites', {
    method: 'POST',
    body: payload,
  });
}

export async function acceptInvite(token: string, password: string): Promise<{ user: { id: string; email: string } }> {
  return apiFetch<{ user: { id: string; email: string } }>('/api/invites/accept', {
    method: 'POST',
    body: { token, password },
  });
}
