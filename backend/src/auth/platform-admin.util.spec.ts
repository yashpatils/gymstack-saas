import { isPlatformAdmin, parsePlatformAdminEmails } from './platform-admin.util';

describe('platform-admin.util', () => {
  it('parses comma, semicolon, and whitespace separated emails', () => {
    expect(parsePlatformAdminEmails(' Admin@One.com,admin@two.com;\nadmin@three.com\tadmin@four.com ')).toEqual([
      'admin@one.com',
      'admin@two.com',
      'admin@three.com',
      'admin@four.com',
    ]);
  });

  it('matches allowlisted emails case-insensitively', () => {
    const allowlistedEmails = parsePlatformAdminEmails('admin@gymstack.club');

    expect(isPlatformAdmin('Admin@GymStack.Club', allowlistedEmails)).toBe(true);
  });
});
