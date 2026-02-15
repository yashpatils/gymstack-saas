import type { ActiveContext } from '../../types/auth';

const ACTIVE_CONTEXT_STORAGE_KEY = 'gymstack_active_context';

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
}

export function clearStoredActiveContext(): void {
  if (isServer()) {
    return;
  }

  window.localStorage.removeItem(ACTIVE_CONTEXT_STORAGE_KEY);
}
