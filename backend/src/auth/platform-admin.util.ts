import { Role } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

export function getPlatformAdminEmails(config: ConfigService): string[] {
  return (config.get<string>('PLATFORM_ADMIN_EMAILS') ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);
}

export function isAllowlistedPlatformAdminEmail(config: ConfigService, email?: string | null): boolean {
  if (!email) {
    return false;
  }

  const normalizedEmail = email.trim().toLowerCase();
  return getPlatformAdminEmails(config).includes(normalizedEmail);
}

export function isPlatformAdminUser(
  config: ConfigService,
  input: { role?: Role | string | null; email?: string | null },
): boolean {
  return input.role === Role.PLATFORM_ADMIN || isAllowlistedPlatformAdminEmail(config, input.email);
}
