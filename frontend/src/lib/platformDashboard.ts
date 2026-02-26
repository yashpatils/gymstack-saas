import type { User } from './users';

export type DashboardMemberRow = {
  id: string;
  name: string;
  email: string;
  status: string;
};

export function mapUsersToMemberRows(users: User[]): DashboardMemberRow[] {
  return users.slice(0, 10).map((user) => ({
    id: user.id,
    name: user.email?.split('@')[0] ?? 'Unknown member',
    email: user.email,
    status: user.subscriptionStatus ?? 'Not configured',
  }));
}

export function formatDashboardMetric(metricsAvailable: boolean, value: number | null | undefined): string {
  if (!metricsAvailable) {
    return 'Not available';
  }
  return String(value ?? 0);
}
