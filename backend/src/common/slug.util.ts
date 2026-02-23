export const RESERVED_SLUGS = ['admin', 'www', 'api', 'app', 'static', 'assets', 'cdn', 'mail', 'support'] as const;
export const RESERVED_SUBDOMAINS = new Set(RESERVED_SLUGS);

export function normalizeSlug(input: string): string {
  return input.trim().toLowerCase();
}

export function isValidSlugFormat(slug: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/.test(slug);
}

export function validateTenantSlug(slugRaw: string): { ok: true; slug: string } | { ok: false; reason: string } {
  const slug = normalizeSlug(slugRaw ?? '');

  if (!slug) {
    return { ok: false, reason: 'Slug is required' };
  }

  if (!isValidSlugFormat(slug)) {
    return { ok: false, reason: 'Use 3–63 chars: lowercase letters, numbers, hyphens' };
  }

  if (RESERVED_SUBDOMAINS.has(slug)) {
    return { ok: false, reason: 'This slug is reserved' };
  }

  return { ok: true, slug };
}
