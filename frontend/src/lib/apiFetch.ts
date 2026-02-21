import { clearTokens, getAccessToken } from './auth/tokenStore';
import { clearStoredActiveContext, getStoredActiveContext } from './auth/contextStore';
import { getStoredPlatformRole, getSupportModeContext, setStoredPlatformRole, setSupportModeContext } from './supportMode';
import { addFrontendBreadcrumb, captureFrontendApiError } from './monitoring';

type ApiFetchInit = Omit<RequestInit, 'body'> & {
  body?: BodyInit | Record<string, unknown> | null;
  skipAuthRetry?: boolean;
};

type ResponseValidator<T> = (value: unknown) => value is T;

const DEV_LOCALHOST_API_URL = 'http://localhost:3000';

let refreshAccessToken: (() => Promise<string | null>) | null = null;
let handleUnauthorized: (() => void) | null = null;

let didHandleUnauthorizedRedirect = false;

function handleUnauthorizedResponse(): void {
  clearTokens();
  clearStoredActiveContext();
  setStoredPlatformRole(null);
  setSupportModeContext(null);

  if (handleUnauthorized) {
    handleUnauthorized();
  }

  if (isServer() || didHandleUnauthorizedRedirect) {
    return;
  }

  didHandleUnauthorizedRedirect = true;
  const params = new URLSearchParams({
    message: 'Session expired. Please sign in again.',
    next: getCurrentBrowserPath(),
  });
  window.location.assign(`/login?${params.toString()}`);
}

export type ApiRateLimitSnapshot = {
  limit?: number;
  remaining?: number;
  retryAfterSeconds?: number;
  observedAtIso: string;
};

let lastRequestId: string | null = null;

export function getLastApiRateLimitSnapshot(): ApiRateLimitSnapshot | null {
  return null;
}

export function getLastApiRequestId(): string | null {
  return lastRequestId;
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

export class ApiUnauthorizedError extends ApiFetchError {
  constructor(details?: unknown, requestId?: string) {
    super('Unauthorized', 401, details, requestId);
    this.name = 'ApiUnauthorizedError';
  }
}

function extractApiErrorCode(details: unknown): string | null {
  if (!details || typeof details !== 'object') {
    return null;
  }

  if ('code' in details && typeof details.code === 'string') {
    return details.code;
  }

  return null;
}

function getCurrentBrowserPath(): string {
  if (typeof window === 'undefined') {
    return '/platform';
  }

  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function redirectUnverifiedUserToVerifyEmail(): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (window.location.pathname === '/verify-email') {
    return;
  }

  const params = new URLSearchParams({
    next: getCurrentBrowserPath(),
  });
  window.location.assign(`/verify-email?${params.toString()}`);
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


function extractErrorCode(details: unknown): string | null {
  if (!details || typeof details !== 'object') {
    return null;
  }

  if ('code' in details && typeof details.code === 'string') {
    return details.code;
  }

  if ('message' in details && typeof details.message === 'object' && details.message !== null) {
    if ('code' in details.message && typeof details.message.code === 'string') {
      return details.message.code;
    }
  }

  return null;
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

export async function apiFetch<T>(
  path: string,
  init: ApiFetchInit = {},
  validate?: ResponseValidator<T>,
): Promise<T> {
  const headers = new Headers(init.headers ?? {});
  const token = getAccessToken();

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  const method = (init.method ?? 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD' && !headers.has('X-Requested-With')) {
    headers.set('X-Requested-With', 'XMLHttpRequest');
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
  if (activeContext?.tenantId) {
    headers.set('X-Active-Tenant-Id', activeContext.tenantId);
    if (activeContext.locationId) {
      headers.set('X-Active-Location-Id', activeContext.locationId);
    }
  }

  const requestBody = isRecordBody(init.body) ? JSON.stringify(init.body) : init.body;
  addFrontendBreadcrumb({
    category: 'api',
    message: `${method} ${path}`,
    data: { route: path },
  });
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

  if (response.status === 401) {
    handleUnauthorizedResponse();
  }

  const contentType = response.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const requestId = response.headers.get('x-request-id') ?? undefined;
  lastRequestId = requestId ?? null;

  if (!response.ok) {
    const details = isJson ? await response.json() : await response.text();
    const errorCode = extractErrorCode(details);

    if (!isServer() && response.status === 403 && errorCode === 'EMAIL_NOT_VERIFIED') {
      const params = new URLSearchParams({
        reason: 'EMAIL_NOT_VERIFIED',
        next: getCurrentBrowserPath(),
      });
      window.location.assign(`/verify-email?${params.toString()}`);
    }

    const apiErrorCode = extractApiErrorCode(details);
    const message =
      typeof details === 'string'
        ? details
        : details && typeof details === 'object' && 'message' in details
          ? String(details.message)
          : apiErrorCode
            ? `API request failed: ${apiErrorCode}`
          : `Request failed with status ${response.status}`;

    const apiError = response.status === 401
      ? new ApiUnauthorizedError(details, requestId)
      : new ApiFetchError(message, response.status, details, requestId);
    if (response.status >= 500) {
      captureFrontendApiError(apiError, { path, method, requestId });
    }
    throw apiError;
  }

  if (!isJson) {
    throw new ApiFetchError('Expected JSON response from API', response.status, await response.text(), requestId);
  }

  const payload = await response.json();
  if (validate && !validate(payload)) {
    throw new ApiFetchError('Invalid API response shape', response.status, payload, requestId);
  }

  return payload;
}
