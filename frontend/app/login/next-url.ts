const ADMIN_HOST = 'admin.gymstack.club';
const ALLOWED_NEXT_HOSTS = new Set(['gymstack.club', 'www.gymstack.club', ADMIN_HOST]);

export function getValidatedNextUrl(rawNext: string | null, isAdminHost: boolean): string | null {
  if (!rawNext) {
    return null;
  }

  if (rawNext.startsWith('/')) {
    return rawNext;
  }

  try {
    const parsed = new URL(rawNext);
    const isAllowedHost = ALLOWED_NEXT_HOSTS.has(parsed.host.toLowerCase());
    const isAllowedProtocol = parsed.protocol === 'https:' || parsed.protocol === 'http:';
    if (!isAllowedHost || !isAllowedProtocol) {
      return null;
    }

    if (isAdminHost && parsed.host.toLowerCase() === 'gymstack.club') {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}
