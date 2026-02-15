export type SupportModeContext = {
  tenantId: string;
  locationId?: string;
};

const SUPPORT_CONTEXT_KEY = 'gymstack_support_mode_context';
const PLATFORM_ROLE_KEY = 'gymstack_platform_role';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function getStoredPlatformRole(): 'PLATFORM_ADMIN' | null {
  if (!isBrowser()) {
    return null;
  }

  return window.localStorage.getItem(PLATFORM_ROLE_KEY) === 'PLATFORM_ADMIN' ? 'PLATFORM_ADMIN' : null;
}

export function setStoredPlatformRole(platformRole: 'PLATFORM_ADMIN' | null): void {
  if (!isBrowser()) {
    return;
  }

  if (!platformRole) {
    window.localStorage.removeItem(PLATFORM_ROLE_KEY);
    return;
  }

  window.localStorage.setItem(PLATFORM_ROLE_KEY, platformRole);
}

export function getSupportModeContext(): SupportModeContext | null {
  if (!isBrowser()) {
    return null;
  }

  const rawValue = window.localStorage.getItem(SUPPORT_CONTEXT_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as { tenantId?: unknown; locationId?: unknown };
    if (typeof parsed.tenantId !== 'string' || parsed.tenantId.trim().length === 0) {
      return null;
    }

    return {
      tenantId: parsed.tenantId.trim(),
      locationId: typeof parsed.locationId === 'string' && parsed.locationId.trim().length > 0 ? parsed.locationId.trim() : undefined,
    };
  } catch {
    return null;
  }
}

export function setSupportModeContext(context: SupportModeContext | null): void {
  if (!isBrowser()) {
    return;
  }

  if (!context) {
    window.localStorage.removeItem(SUPPORT_CONTEXT_KEY);
    return;
  }

  window.localStorage.setItem(SUPPORT_CONTEXT_KEY, JSON.stringify(context));
}
