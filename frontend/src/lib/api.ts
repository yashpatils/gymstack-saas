import { logout } from './auth';

export function getApiBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) {
    throw new Error(
      'NEXT_PUBLIC_API_URL is missing. Set it to https://gymstack-saas-production.up.railway.app in frontend environment variables.',
    );
  }

  return base.replace(/\/+$/, '');
}

export function getApiPrefix(): string {
  const prefix = process.env.NEXT_PUBLIC_API_PREFIX ?? '/api';
  if (!prefix) {
    return '';
  }

  const normalized = prefix.startsWith('/') ? prefix : `/${prefix}`;
  return normalized.replace(/\/+$/, '');
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function apiFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const base = getApiBaseUrl();
  const apiPrefix = getApiPrefix();
  const token =
    typeof window !== 'undefined'
      ? window.localStorage.getItem('accessToken')
      : null;

  const urlPath = path.startsWith('/') ? path : `/${path}`;
  const escapedPrefix = escapeRegex(apiPrefix);
  const baseHasApiPrefix =
    apiPrefix.length > 0 &&
    new RegExp(`${escapedPrefix}(?:\\/)?$`, 'i').test(base);
  const pathHasApiPrefix =
    apiPrefix.length > 0 &&
    new RegExp(`^${escapedPrefix}(?:\\/|$)`, 'i').test(urlPath);
  const isUnprefixedRoute = /^\/health(?:\/|$)/i.test(urlPath);
  const prefixedPath =
    !apiPrefix || baseHasApiPrefix || pathHasApiPrefix || isUnprefixedRoute
      ? urlPath
      : `${apiPrefix}${urlPath}`;
  const url = `${base}${prefixedPath}`;

  const headers = new Headers(options.headers ?? {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    credentials: 'omit',
    headers,
  });

  if (response.status === 401 && typeof window !== 'undefined') {
    logout();
    window.location.assign('/login');
  }

  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;

    try {
      const data = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(data?.message)) {
        message = data.message.join(', ');
      } else if (data?.message) {
        message = data.message;
      }
    } catch {
      // Ignore non-JSON error bodies and keep the default message.
    }

    throw new Error(message);
  }

  return response;
}
