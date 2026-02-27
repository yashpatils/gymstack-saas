import { resolveAccessTokenTtlMinutes, resolveRefreshTokenTtlDays } from './token-ttl.util';

describe('token ttl utilities', () => {
  it('uses defaults when env values are missing or invalid', () => {
    expect(resolveAccessTokenTtlMinutes(undefined)).toBe(15);
    expect(resolveAccessTokenTtlMinutes('abc')).toBe(15);
    expect(resolveRefreshTokenTtlDays(undefined)).toBe(30);
    expect(resolveRefreshTokenTtlDays('nope')).toBe(30);
  });

  it('clamps configured values to safe ranges', () => {
    expect(resolveAccessTokenTtlMinutes('0')).toBe(15);
    expect(resolveAccessTokenTtlMinutes('999999')).toBe(24 * 60);
    expect(resolveRefreshTokenTtlDays('-1')).toBe(30);
    expect(resolveRefreshTokenTtlDays('999999')).toBe(365);
  });
});
