import { describe, expect, it } from 'vitest';
import { getValidatedNextUrl } from './next-url';

describe('getValidatedNextUrl', () => {
  it('accepts relative next paths', () => {
    expect(getValidatedNextUrl('/', true)).toBe('/');
    expect(getValidatedNextUrl('/platform', false)).toBe('/platform');
  });

  it('accepts allowed absolute origins', () => {
    expect(getValidatedNextUrl('https://admin.gymstack.club/', true)).toBe('https://admin.gymstack.club/');
    expect(getValidatedNextUrl('https://gymstack.club/platform', false)).toBe('https://gymstack.club/platform');
  });

  it('rejects disallowed hosts and protocols', () => {
    expect(getValidatedNextUrl('https://evil.com', true)).toBeNull();
    expect(getValidatedNextUrl('javascript:alert(1)', true)).toBeNull();
  });
});
