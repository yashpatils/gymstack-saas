import { apiFetch } from './apiFetch';

export type AiActionType = 'INVITE_MEMBERS_BACK' | 'CREATE_CLASS_SLOT' | 'UPGRADE_PLAN';

export type WeeklyAiBrief = {
  generatedAt: string;
  summary: string;
  insights: Array<{ bullet: string; actionType: AiActionType | null }>;
  metrics: {
    attendanceChangePct: number;
    inactiveMembers: number;
    topClass: string | null;
    overbookedClasses: string[];
    planUsage: {
      staffSeatsUsed: number;
      staffSeatLimit: number | null;
      seatUsagePct: number | null;
      locationsUsed: number;
      locationLimit: number | null;
      locationUsagePct: number | null;
    };
    risks: string[];
    opportunities: string[];
  };
};

export async function getWeeklyAiBrief(): Promise<{ cached: boolean; insight: WeeklyAiBrief }> {
  return apiFetch<{ cached: boolean; insight: WeeklyAiBrief }>('/api/ai/weekly-brief', {
    method: 'GET',
    cache: 'no-store',
  });
}
