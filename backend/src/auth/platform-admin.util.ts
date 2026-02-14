import { Role } from '@prisma/client';

function getPlatformAdminEmailAllowlist(): string[] {
  const raw = process.env.PLATFORM_ADMIN_EMAILS ?? '';
  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);
}

export function isAllowlistedPlatformAdminEmail(email?: string | null): boolean {
  if (!email) {
    return false;
  }

  const normalizedEmail = email.trim().toLowerCase();
  return getPlatformAdminEmailAllowlist().includes(normalizedEmail);
}

export function isPlatformAdminUser(input: { role?: Role | string | null; email?: string | null }): boolean {
  return input.role === Role.PLATFORM_ADMIN || isAllowlistedPlatformAdminEmail(input.email);
}

