import {
  apiFetch,
  buildApiUrl,
  getApiBaseUrl,
} from "./apiFetch";

export { apiFetch, buildApiUrl, getApiBaseUrl };

export type ApiRateLimitSnapshot = {
  limit?: number;
  remaining?: number;
  retryAfterSeconds?: number;
  observedAtIso: string;
};

export type ApiError = {
  message: string;
  statusCode?: number;
  error?: string;
  details?: unknown;
  requestId?: string;
};

export function getLastApiRateLimitSnapshot(): ApiRateLimitSnapshot | null {
  return null;
}
