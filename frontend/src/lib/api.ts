const GET_CACHE_TTL_MS = 10_000;

type CacheMode = 'default' | 'no-store';
type ApiFetchOptions = RequestInit & { cache?: CacheMode };

type CacheEntry = {
  expiresAt: number;
  value: unknown;
};

const getResponseCache = new Map<string, CacheEntry>();
const inflightGetRequests = new Map<string, Promise<unknown>>();

export function getApiBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) {
    throw new Error('NEXT_PUBLIC_API_URL is missing. Set it in your frontend environment variables.');
  }

  return base.replace(/\/+$/, '');
}

function normalizePath(path: string): string {
  if (!path) {
    return '';
  }

  return `/${path}`.replace(/\/+/g, '/').replace(/\/+$/g, '');
}

export function buildApiUrl(path: string): string {
  const base = getApiBaseUrl();
  const normalizedPath = normalizePath(path);
  return `${base}${normalizedPath}`.replace(/([^:]\/)(\/+)/g, '$1');
}

export type ApiError = {
  message: string;
  statusCode?: number;
  error?: string;
  details?: unknown;
};

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const url = buildApiUrl(path);
  const method = (options.method ?? 'GET').toUpperCase();
  const cacheMode: CacheMode = options.cache ?? 'default';
  const shouldUseGetCache = method === 'GET' && cacheMode !== 'no-store';
  const token =
    typeof window !== 'undefined'
      ? window.localStorage.getItem('gymstack_token')
      : null;

  const headers = new Headers(options.headers ?? {});
  let requestBody: BodyInit | undefined;

  const isPlainObject = (v: unknown): v is Record<string, unknown> =>
    !!v
    && typeof v === 'object'
    && !(v instanceof FormData)
    && !(v instanceof URLSearchParams)
    && !(v instanceof Blob)
    && !(v instanceof ArrayBuffer);

  if (options.body !== undefined) {
    if (isPlainObject(options.body)) {
      requestBody = JSON.stringify(options.body);
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
    } else {
      requestBody = options.body as BodyInit;
    }
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const getCacheKey = (): string => {
    const normalizedHeaders = [...headers.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join('|');

    return `${method}:${url}:${normalizedHeaders}`;
  };

  const executeRequest = async (): Promise<T> => {
    const response = await fetch(url, {
      ...options,
      body: requestBody,
      credentials: 'omit',
      headers,
    });

    const contentType = response.headers.get('content-type') ?? '';

    if (!response.ok) {
      let errorBody: unknown;

      if (contentType.includes('application/json')) {
        errorBody = await response.json();
      } else {
        errorBody = await response.text();
      }

      throw new Error(`Request failed (${response.status} ${response.statusText}): ${typeof errorBody === 'string' ? errorBody : JSON.stringify(errorBody)}`);
    }

    if (contentType.includes('application/json')) {
      return (await response.json()) as T;
    }

    return (await response.text()) as T;
  };

  if (!shouldUseGetCache) {
    return executeRequest();
  }

  const cacheKey = getCacheKey();
  const now = Date.now();
  const cachedEntry = getResponseCache.get(cacheKey);

  if (cachedEntry && cachedEntry.expiresAt > now) {
    return cachedEntry.value as T;
  }

  if (cachedEntry) {
    getResponseCache.delete(cacheKey);
  }

  const inflightRequest = inflightGetRequests.get(cacheKey);
  if (inflightRequest) {
    return inflightRequest as Promise<T>;
  }

  const requestPromise = executeRequest()
    .then((result) => {
      getResponseCache.set(cacheKey, {
        expiresAt: Date.now() + GET_CACHE_TTL_MS,
        value: result,
      });

      return result;
    })
    .finally(() => {
      inflightGetRequests.delete(cacheKey);
    });

  inflightGetRequests.set(cacheKey, requestPromise as Promise<unknown>);

  return requestPromise;
}
