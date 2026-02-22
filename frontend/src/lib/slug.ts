export const RESERVED_SUBDOMAINS = new Set(['admin', 'www', 'api', 'app', 'static']);

export function normalizeSlug(input: string): string {
  return input.trim().toLowerCase();
}

export function isValidSlugFormat(slug: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/.test(slug);
}

