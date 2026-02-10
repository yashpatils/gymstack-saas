import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

export function getToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem('accessToken');
}

export function logout() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem('accessToken');
}

export function requireAuth(router: AppRouterInstance): string | null {
  const token = getToken();
  if (!token) {
    router.replace('/login');
    return null;
  }

  return token;
}
