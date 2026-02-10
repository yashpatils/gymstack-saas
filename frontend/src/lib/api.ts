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
  let requestBody: BodyInit | undefined = options.body as any;

  const isPlainObject = (v: unknown): v is Record<string, unknown> =>
    !!v
    && typeof v === 'object'
    && !(v instanceof FormData)
    && !(v instanceof URLSearchParams)
    && !(v instanceof Blob)
    && !(v instanceof ArrayBuffer);

  if (isPlainObject(options.body)) {
    requestBody = JSON.stringify(options.body);
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

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
}
