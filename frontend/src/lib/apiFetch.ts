import { getAccessToken } from './auth/tokenStore';
import { getStoredActiveContext } from './auth/contextStore';
import { getStoredPlatformRole, getSupportModeContext } from './supportMode';

type ApiFetchInit = Omit<RequestInit, 'body'> & {
  body?: BodyInit | Record<string, unknown> | null;
  skipAuthRetry?: boolean;
};

const DEV_LOCALHOST_API_URL = 'http://localhost:3000';

let refreshAccessToken: (() => Promise<string | null>) | null = null;
let handleUnauthorized: (() => void) | null = null;

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

export function configureApiAuth(
  refreshFn: () => Promise<string | null>,
  onUnauthorized?: () => void,
): void {
  refreshAccessToken = refreshFn;
  handleUnauthorized = onUnauthorized ?? null;
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

export function getApiBaseUrl(): string {
  const serverUrl = (process.env.API_URL ?? '').trim().replace(/\/+$/, '');
  const publicUrl = (process.env.NEXT_PUBLIC_API_URL ?? '').trim().replace(/\/+$/, '');

  if (isServer()) {
    if (serverUrl) {
      return serverUrl;
    }
    if (publicUrl) {
      return publicUrl;
    }
    return DEV_LOCALHOST_API_URL;
  }

  return publicUrl;
}

export function buildApiUrl(path: string): string {
  const normalized = normalizePath(path);
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    return normalized;
  }

  if (!isServer()) {
    const baseUrl = getApiBaseUrl();
    if (baseUrl) {
      return `${baseUrl}${normalized}`;
    }
    return `/api/proxy${normalized}`;
  }

  const baseUrl = getApiBaseUrl();
  return `${baseUrl}${normalized}`;
}

export async function apiFetch<T>(path: string, init: ApiFetchInit = {}): Promise<T> {
  const headers = new Headers(init.headers ?? {});
  const token = getAccessToken();

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }


  const platformRole = getStoredPlatformRole();
  const supportContext = getSupportModeContext();
  const activeContext = getStoredActiveContext();
  if (platformRole === 'PLATFORM_ADMIN' && supportContext) {
    headers.set('X-Support-Tenant-Id', supportContext.tenantId);
    if (supportContext.locationId) {
      headers.set('X-Support-Location-Id', supportContext.locationId);
    }
  }
  if (activeContext) {
    headers.set('X-Active-Tenant-Id', activeContext.tenantId);
    if (activeContext.locationId) {
      headers.set('X-Active-Location-Id', activeContext.locationId);
    }
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

  if (response.status === 401 && handleUnauthorized) {
    handleUnauthorized();
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
