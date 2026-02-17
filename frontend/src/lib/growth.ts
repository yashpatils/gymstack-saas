import { apiFetch } from './apiFetch';

export type GrowthChecklistItem = {
  key: string;
  label: string;
  completed: boolean;
  href: string;
};

export type GrowthStatus = {
  tenantId: string;
  trialEndsAt: string;
  trialDaysLeft: number;
  isTrialExpired: boolean;
  checklist: GrowthChecklistItem[];
  completedSteps: number;
  totalSteps: number;
  inactiveDays: 0 | 3 | 7 | 14;
};

export async function getGrowthStatus(): Promise<GrowthStatus> {
  return apiFetch<GrowthStatus>('/api/org/growth-status', { method: 'GET' });
}
