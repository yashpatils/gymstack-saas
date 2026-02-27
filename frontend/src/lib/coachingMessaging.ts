import { apiFetch } from './apiFetch';

export type CoachingAssignment = {
  id: string;
  coachUserId: string;
  clientUserId: string;
  locationId: string;
  lastMessageAt: string | null;
  lastReadAtCoach: string | null;
  lastReadAtClient: string | null;
  coach?: { id: string; name: string | null; email: string };
  client?: { id: string; name: string | null; email: string };
};

export type CoachingMessage = {
  id: string;
  senderUserId: string;
  body: string;
  createdAt: string;
  sender?: { id: string; name: string | null; email: string };
};

export function listAssignments() {
  return apiFetch<CoachingAssignment[]>('/api/coaching/assignments');
}

export function createAssignment(payload: { locationId: string; coachUserId: string; clientUserId: string }) {
  return apiFetch<CoachingAssignment>('/api/coaching/assignments', { method: 'POST', body: payload });
}

export function deleteAssignment(id: string) {
  return apiFetch<{ success: boolean }>(`/api/coaching/assignments/${id}`, { method: 'DELETE' });
}

export function listMessages(assignmentId: string, cursor?: string, limit = 25) {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  params.set('limit', String(limit));
  return apiFetch<{ items: CoachingMessage[]; nextCursor: string | null }>(`/api/coaching/assignments/${assignmentId}/messages?${params.toString()}`);
}

export function sendMessage(assignmentId: string, body: string) {
  return apiFetch<CoachingMessage>(`/api/coaching/assignments/${assignmentId}/messages`, { method: 'POST', body: { body } });
}

export function markRead(assignmentId: string) {
  return apiFetch<{ success: boolean; readAt: string }>(`/api/coaching/assignments/${assignmentId}/read`, { method: 'POST' });
}
