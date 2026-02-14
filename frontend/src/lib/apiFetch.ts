type ApiFetchInit = Omit<RequestInit, 'body'> & {
  body?: BodyInit | Record<string, unknown> | null;
  skipAuthRetry?: boolean;
};

const AUTH_TOKEN_STORAGE_KEY = 'gymstack_token';
const DEV_LOCALHOST_API_URL = 'http://localhost:3000';

let getAccessToken: (() => string | null) | null = null;
let refreshAccessToken: (() => Promise<string | null>) | null = null;

export type ApiRateLimitSnapshot = {
  limit?: number;
  remaining?: number;
  retryAfterSeconds?: number;
  observedAtIso: string;
};

export function getLastApiRateLimitSnapshot(): ApiRateLimitSnapshot | null {
  return null;
}

export class ApiFetchError extends Error {
  statusCode: number;
  details?: unknown;
  requestId?: string;

  constructor(message: string, statusCode: number, details?: unknown, requestId?: string) {
    super(message);
    this.name = 'ApiFetchError';
    this.statusCode = statusCode;
    this.details = details;
    this.requestId = requestId;
  }
}

export function configureApiAuth(getTokenFn: () => string | null, refreshFn: () => Promise<string | null>): void {
  getAccessToken = getTokenFn;
  refreshAccessToken = refreshFn;
}

function normalizePath(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  return `/${path}`.replace(/\/+/g, '/');
}

function isServer(): boolean {
  return typeof window === 'undefined';
}

function isRecordBody(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !(value instanceof FormData) &&
    !(value instanceof URLSearchParams) &&
    !(value instanceof Blob) &&
    !(value instanceof ArrayBuffer)
  );
}

function getStoredAuthToken(): string | null {
  if (getAccessToken) {
    return getAccessToken();
  }

  if (isServer()) {
    return null;
  }

  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

export function getApiBaseUrl(): string {
  const publicUrl = (process.env.NEXT_PUBLIC_API_URL ?? '').trim().replace(/\/+$/, '');
  const serverUrl = (process.env.API_URL ?? '').trim().replace(/\/+$/, '');

  if (isServer()) {
    if (serverUrl) {
      return serverUrl;
    }
    if (publicUrl) {
      return publicUrl;
    }
    return DEV_LOCALHOST_API_URL;
  }

  if (publicUrl) {
    return publicUrl;
  }

  return '';
}

export function buildApiUrl(path: string): string {
  const normalized = normalizePath(path);
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    return normalized;
  }

  if (!isServer()) {
    return `/api/proxy${normalized}`;
  }

  const baseUrl = getApiBaseUrl();
  return `${baseUrl}${normalized}`;
}

export async function apiFetch<T>(path: string, init: ApiFetchInit = {}): Promise<T> {
  const headers = new Headers(init.headers ?? {});
  const token = getStoredAuthToken();

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const requestBody = isRecordBody(init.body) ? JSON.stringify(init.body) : init.body;
  if (isRecordBody(init.body) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const { skipAuthRetry, ...requestInit } = init;
  const response = await fetch(buildApiUrl(path), {
    ...requestInit,
    headers,
    body: requestBody,
    credentials: init.credentials ?? 'same-origin',
  });

  if (response.status === 401 && !skipAuthRetry && refreshAccessToken) {
    const refreshedToken = await refreshAccessToken();
    if (refreshedToken) {
      return apiFetch<T>(path, { ...init, skipAuthRetry: true });
    }
  }

  const contentType = response.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const requestId = response.headers.get('x-request-id') ?? undefined;

  if (!response.ok) {
    const details = isJson ? ((await response.json()) as unknown) : await response.text();
    const message =
      typeof details === 'string'
        ? details
        : details && typeof details === 'object' && 'message' in details
          ? String((details as { message: unknown }).message)
          : `Request failed with status ${response.status}`;

    throw new ApiFetchError(message, response.status, details, requestId);
  }

  if (!isJson) {
    throw new ApiFetchError('Expected JSON response from API', response.status, await response.text(), requestId);
  }

  return (await response.json()) as T;
}
