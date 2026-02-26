import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { normalizeOrigin } from './origin.util';

const DEFAULT_ALLOWED_ORIGINS = [
  'https://gymstack.club',
  'https://www.gymstack.club',
  'https://admin.gymstack.club',
  'https://gymstack-saas.vercel.app',
  'http://localhost:3000',
];

const DEFAULT_ALLOWED_ORIGIN_REGEXES_NON_PROD = [
  '^https:\\/\\/[a-z0-9-]+\\.gymstack\\.club$',
  '^https:\\/\\/gymstack-saas(?:-[a-z0-9-]+)*\\.vercel\\.app$',
  '^http:\\/\\/localhost(?::\\d+)?$',
  '^http:\\/\\/127\\.0\\.0\\.1(?::\\d+)?$',
];

const DEFAULT_ALLOWED_ORIGIN_REGEXES_PROD = [
  '^https:\\/\\/[a-z0-9-]+\\.gymstack\\.club$',
  '^https:\\/\\/gymstack-saas(?:-[a-z0-9-]+)*\\.vercel\\.app$',
];

function parseEnvList(value?: string): string[] {
  return (
    value
      ?.split(',')
      .map((entry) => entry.trim())
      .filter(Boolean) ?? []
  );
}

export function getAllowedOrigins(configService: ConfigService): Set<string> {
  const configuredOrigins = parseEnvList(configService.get<string>('ALLOWED_ORIGINS'));
  const legacyOrigins = parseEnvList(configService.get<string>('FRONTEND_URL'));
  const allOrigins = [...DEFAULT_ALLOWED_ORIGINS, ...legacyOrigins, ...configuredOrigins];

  return new Set(allOrigins.map((origin) => normalizeOrigin(origin)).filter(Boolean));
}

export function getAllowedOriginRegexes(configService: ConfigService, isProduction: boolean): RegExp[] {
  const logger = new Logger('Bootstrap');
  const configuredRegexes = parseEnvList(configService.get<string>('ALLOWED_ORIGIN_REGEXES'));
  const defaultRegexes = isProduction
    ? DEFAULT_ALLOWED_ORIGIN_REGEXES_PROD
    : DEFAULT_ALLOWED_ORIGIN_REGEXES_NON_PROD;
  const regexValues = [...defaultRegexes, ...configuredRegexes];

  return regexValues
    .map((expression) => {
      try {
        return new RegExp(expression);
      } catch {
        logger.warn(`Ignoring invalid ALLOWED_ORIGIN_REGEXES entry: ${expression}`);
        return null;
      }
    })
    .filter((regex): regex is RegExp => Boolean(regex));
}

export function isOriginAllowed(
  origin: string,
  allowlist: Set<string>,
  allowRegexes: RegExp[],
): boolean {
  const normalizedOrigin = normalizeOrigin(origin);

  if (allowlist.has(normalizedOrigin)) {
    return true;
  }

  return allowRegexes.some((regex) => regex.test(normalizedOrigin));
}
