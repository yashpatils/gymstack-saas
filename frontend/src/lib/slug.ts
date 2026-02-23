export const RESERVED_SLUGS = ['admin', 'www', 'api', 'app', 'static', 'assets', 'cdn', 'mail', 'support'] as const;
export const RESERVED_SUBDOMAINS = new Set(RESERVED_SLUGS);

export function normalizeSlug(input: string): string {
  return input.trim().toLowerCase();
}

export function isValidSlugFormat(slug: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/.test(slug);
}
