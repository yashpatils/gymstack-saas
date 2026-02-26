import { describe, expect, it } from 'vitest';
import { ADMIN_PORTAL_FRESH_LOGIN_URL, ADMIN_PORTAL_HOST, ADMIN_PORTAL_URL } from './adminPortal';

describe('adminPortal constants', () => {
  it('keeps the jump URL pinned to admin host login with fresh session', () => {
    expect(ADMIN_PORTAL_HOST).toBe('admin.gymstack.club');
    expect(ADMIN_PORTAL_URL).toBe('https://admin.gymstack.club');
    expect(ADMIN_PORTAL_FRESH_LOGIN_URL).toBe('https://admin.gymstack.club/login?fresh=1');
  });
});
