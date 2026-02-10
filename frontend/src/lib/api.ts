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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = buildApiUrl(path);
  const token =
    typeof window !== 'undefined'
      ? window.localStorage.getItem('gymstack_token')
      : null;

  const headers = new Headers(options.headers ?? {});

  let body = options.body;
  if (isPlainObject(body)) {
    body = JSON.stringify(body);
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    body,
    credentials: 'omit',
    headers,
  });

  const contentType = response.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const parsedBody = isJson
    ? ((await response.json()) as unknown)
    : ((await response.text()) as unknown);

  if (!response.ok) {
    const detail =
      typeof parsedBody === 'string'
        ? parsedBody
        : JSON.stringify(parsedBody);
    throw new Error(`Request failed (${response.status} ${response.statusText}): ${detail}`);
  }

  return parsedBody as T;
}
