import { ConfigService } from '@nestjs/config';

export function parsePlatformAdminEmails(rawValue: string | null | undefined): string[] {
  return (rawValue ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);
}

export function getPlatformAdminEmails(config: ConfigService): string[] {
  return parsePlatformAdminEmails(config.get<string>('PLATFORM_ADMIN_EMAILS'));
}

export function isPlatformAdmin(userEmail: string | null | undefined, allowlistedEmails: string[]): boolean {
  if (!userEmail) {
    return false;
  }

  return allowlistedEmails.includes(userEmail.trim().toLowerCase());
}

export function isAllowlistedPlatformAdminEmail(config: ConfigService, userEmail: string | null | undefined): boolean {
  return isPlatformAdmin(userEmail, getPlatformAdminEmails(config));
}
