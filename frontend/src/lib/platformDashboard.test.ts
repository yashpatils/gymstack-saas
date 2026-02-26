import { describe, expect, it } from 'vitest';
import { formatDashboardMetric, mapUsersToMemberRows } from './platformDashboard';

describe('mapUsersToMemberRows', () => {
  it('uses API subscriptionStatus and does not fabricate from list index', () => {
    const rows = mapUsersToMemberRows([
      { id: '1', email: 'active@example.com', subscriptionStatus: 'ACTIVE' },
      { id: '2', email: 'pending@example.com', subscriptionStatus: 'PENDING' },
      { id: '3', email: 'unknown@example.com', subscriptionStatus: null },
    ]);

    expect(rows.map((row) => row.status)).toEqual(['ACTIVE', 'PENDING', 'Not configured']);
  });
});

describe('formatDashboardMetric', () => {
  it('returns explicit not-available labels when metrics are missing', () => {
    expect(formatDashboardMetric(false, 12)).toBe('Not available');
    expect(formatDashboardMetric(true, 12)).toBe('12');
  });
});
