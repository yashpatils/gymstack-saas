const MIN_ACCESS_TTL_MINUTES = 1;
const MAX_ACCESS_TTL_MINUTES = 24 * 60;
const MIN_REFRESH_TTL_DAYS = 1;
const MAX_REFRESH_TTL_DAYS = 365;

function parseInteger(raw: string | undefined): number | undefined {
  if (!raw) {
    return undefined;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function resolveAccessTokenTtlMinutes(raw: string | undefined): number {
  const parsed = parseInteger(raw);
  if (!parsed) {
    return 15;
  }

  return Math.min(Math.max(parsed, MIN_ACCESS_TTL_MINUTES), MAX_ACCESS_TTL_MINUTES);
}

export function resolveRefreshTokenTtlDays(raw: string | undefined): number {
  const parsed = parseInteger(raw);
  if (!parsed) {
    return 30;
  }

  return Math.min(Math.max(parsed, MIN_REFRESH_TTL_DAYS), MAX_REFRESH_TTL_DAYS);
}
