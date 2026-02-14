import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_RETURN_TO = 'https://gymstack.club/platform';

function normalizeAllowedHostPattern(pattern: string): string {
  return pattern.trim().toLowerCase();
}

function hostMatchesPattern(hostname: string, pattern: string): boolean {
  if (pattern.startsWith('*.')) {
    const suffix = pattern.slice(1);
    return hostname.endsWith(suffix);
  }

  return hostname === pattern;
}

function isPathOnly(value: string): boolean {
  return value.startsWith('/') && !value.startsWith('//');
}

export async function sanitizeReturnTo(
  input: string | undefined,
  appUrl: string,
  allowedReturnHosts: string,
  prisma: PrismaService,
): Promise<string> {
  if (!input) {
    return DEFAULT_RETURN_TO;
  }

  if (isPathOnly(input)) {
    return new URL(input, appUrl).toString();
  }

  try {
    const parsed = new URL(input);
    const hostname = parsed.hostname.toLowerCase();
    const patterns = allowedReturnHosts.split(',').map(normalizeAllowedHostPattern).filter(Boolean);

    const allowlisted = patterns.some((pattern) => hostMatchesPattern(hostname, pattern));
    if (allowlisted) {
      return parsed.toString();
    }

    const activeDomain = await prisma.customDomain.findFirst({
      where: { hostname, status: 'ACTIVE' },
      select: { id: true },
    });

    if (activeDomain) {
      return parsed.toString();
    }

    return DEFAULT_RETURN_TO;
  } catch {
    return DEFAULT_RETURN_TO;
  }
}
