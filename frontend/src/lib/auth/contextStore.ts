import type { ActiveContext } from '../../types/auth';

const ACTIVE_CONTEXT_STORAGE_KEY = 'gymstack_active_context';
const TENANT_LOCATION_CONTEXT_KEY = 'gymstack_tenant_location_context';

export type TenantLocationContext = {
  activeOrgId?: string;
  activeGymId?: string;
  activeRole?: string;
  orgSelectedAt?: string;
  gymSelectedAt?: string;
};

function isServer(): boolean {
  return typeof window === 'undefined';
}

export function getStoredActiveContext(): ActiveContext | null {
  if (isServer()) {
    return null;
  }

  const raw = window.localStorage.getItem(ACTIVE_CONTEXT_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as ActiveContext;
    return parsed;
  } catch {
    return null;
  }
}

export function setStoredActiveContext(context: ActiveContext | undefined): void {
  if (isServer()) {
    return;
  }

  if (!context) {
    window.localStorage.removeItem(ACTIVE_CONTEXT_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(ACTIVE_CONTEXT_STORAGE_KEY, JSON.stringify(context));

  const tenantLocationContext: TenantLocationContext = {
    activeOrgId: context.tenantId ?? undefined,
    activeGymId: (context.locationId ?? context.gymId) ?? undefined,
    activeRole: context.role ?? undefined,
    orgSelectedAt: new Date().toISOString(),
    gymSelectedAt: (context.locationId ?? context.gymId) ? new Date().toISOString() : undefined,
  };
  window.localStorage.setItem(TENANT_LOCATION_CONTEXT_KEY, JSON.stringify(tenantLocationContext));
}

export function getTenantLocationContext(): TenantLocationContext | null {
  if (isServer()) {
    return null;
  }

  const raw = window.localStorage.getItem(TENANT_LOCATION_CONTEXT_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as TenantLocationContext;
  } catch {
    return null;
  }
}

export function clearStoredActiveContext(): void {
  if (isServer()) {
    return;
  }

  window.localStorage.removeItem(ACTIVE_CONTEXT_STORAGE_KEY);
  window.localStorage.removeItem(TENANT_LOCATION_CONTEXT_KEY);
}
