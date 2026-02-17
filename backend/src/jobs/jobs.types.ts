export type JobType = 'email' | 'webhook' | 'insight' | 'class-reminder' | 'data-export';

export type JobPayloadMap = {
  email: { action: 'location-invite'; to: string; inviteUrl: string };
  webhook: { event: string; endpoint: string; body: Record<string, unknown> };
  insight: { tenantId: string; locationId?: string | null };
  'class-reminder': { sessionId: string; userId: string };
  'data-export': { tenantId: string; requestedByUserId: string };
};

export type JobEnvelope<T extends JobType> = {
  id: string;
  type: T;
  payload: JobPayloadMap[T];
  attempts: number;
  maxAttempts: number;
};
