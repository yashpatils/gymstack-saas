import { apiFetch } from './apiFetch';

export type FeedbackPriority = 'low' | 'medium' | 'high';
export type FeedbackStatus = 'open' | 'planned' | 'shipped';
export type FeedbackCategory = 'bug' | 'improvement' | 'feature';
export type ChangelogAudience = 'admin' | 'tenant' | 'staff' | 'client';
export type ReleaseBuildStatus = 'passing' | 'failing' | 'unknown';

export type FeedbackItem = {
  id: string;
  tenantId: string;
  userId: string;
  message: string;
  page: string;
  priority: FeedbackPriority;
  status: FeedbackStatus;
  category: FeedbackCategory | null;
  taskId: string | null;
  createdAt: string;
  tenant?: { id: string; name: string };
  user?: { id: string; email: string };
};

export type ChangelogEntry = {
  id: string;
  title: string;
  description: string;
  audience: ChangelogAudience;
  createdAt: string;
};

export type ReleaseStatus = {
  id: string;
  version: string;
  lastDeployAt: string;
  buildStatus: ReleaseBuildStatus;
  updatedAt: string;
};

export async function submitFeedback(payload: { message: string; page: string; priority: FeedbackPriority; taskId?: string }): Promise<FeedbackItem> {
  return apiFetch<FeedbackItem>('/api/feedback', { method: 'POST', body: payload });
}

export async function listWhatsNew(): Promise<ChangelogEntry[]> {
  return apiFetch<ChangelogEntry[]>('/api/changelog', { method: 'GET', cache: 'no-store' });
}

export async function listAdminFeedback(filters: { tenantId?: string; status?: FeedbackStatus; priority?: FeedbackPriority }): Promise<FeedbackItem[]> {
  const params = new URLSearchParams();
  if (filters.tenantId) params.set('tenantId', filters.tenantId);
  if (filters.status) params.set('status', filters.status);
  if (filters.priority) params.set('priority', filters.priority);
  const query = params.toString();
  return apiFetch<FeedbackItem[]>(`/api/admin/feedback${query ? `?${query}` : ''}`, { method: 'GET', cache: 'no-store' });
}

export async function updateAdminFeedback(id: string, payload: { status?: FeedbackStatus; category?: FeedbackCategory; taskId?: string }): Promise<FeedbackItem> {
  return apiFetch<FeedbackItem>(`/api/admin/feedback/${id}`, { method: 'PATCH', body: payload });
}

export async function listAdminChangelog(): Promise<ChangelogEntry[]> {
  return apiFetch<ChangelogEntry[]>('/api/admin/changelog', { method: 'GET', cache: 'no-store' });
}

export async function createAdminChangelog(payload: { title: string; description: string; audience: ChangelogAudience }): Promise<ChangelogEntry> {
  return apiFetch<ChangelogEntry>('/api/admin/changelog', { method: 'POST', body: payload });
}

export async function getReleaseStatus(): Promise<ReleaseStatus> {
  return apiFetch<ReleaseStatus>('/api/admin/release-status', { method: 'GET', cache: 'no-store' });
}

export async function updateReleaseStatus(payload: { version: string; lastDeployAt: string; buildStatus: ReleaseBuildStatus }): Promise<ReleaseStatus> {
  return apiFetch<ReleaseStatus>('/api/admin/release-status', { method: 'POST', body: payload });
}
