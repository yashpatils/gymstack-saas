import { normalizeSlug, validateTenantSlug } from './slug.util';

describe('slug.util', () => {
  describe('normalizeSlug', () => {
    it('trims whitespace and lowercases input', () => {
      expect(normalizeSlug('  My-Gym-01  ')).toBe('my-gym-01');
    });
  });

  describe('validateTenantSlug', () => {
    it('accepts valid hyphenated slugs', () => {
      expect(validateTenantSlug('  My-Gym-01  ')).toEqual({
        ok: true,
        slug: 'my-gym-01',
      });
    });

    it('rejects reserved slugs', () => {
      const result = validateTenantSlug('admin');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason.toLowerCase()).toContain('reserved');
      }
    });

    it('rejects invalid characters', () => {
      expect(validateTenantSlug('my gym!')).toEqual({
        ok: false,
        reason: expect.stringContaining('3–63 chars'),
      });
    });

    it('rejects too-short slugs', () => {
      expect(validateTenantSlug('ab')).toEqual({
        ok: false,
        reason: expect.stringContaining('3–63 chars'),
      });
    });

    it('rejects too-long slugs', () => {
      expect(validateTenantSlug(`gym-${'a'.repeat(70)}`)).toEqual({
        ok: false,
        reason: expect.stringContaining('3–63 chars'),
      });
    });

    it('rejects leading hyphen', () => {
      expect(validateTenantSlug('-gym')).toEqual({
        ok: false,
        reason: expect.stringContaining('3–63 chars'),
      });
    });

    it('rejects trailing hyphen', () => {
      expect(validateTenantSlug('gym-')).toEqual({
        ok: false,
        reason: expect.stringContaining('3–63 chars'),
      });
    });
  });
});
