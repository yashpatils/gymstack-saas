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
  options: RequestInit = {},
): Promise<T> {
  const url = buildApiUrl(path);
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

  const response = await fetch(url, {
    ...options,
    ...(requestBody !== undefined ? { body: requestBody } : {}),
    credentials: 'omit',
    headers,
  });

  const contentType = response.headers.get('content-type') ?? '';

  if (!response.ok) {
    const rawErrorBody = await response.text();
    let parsedErrorBody: unknown = rawErrorBody;

    if (rawErrorBody) {
      try {
        parsedErrorBody = JSON.parse(rawErrorBody) as unknown;
      } catch {
        parsedErrorBody = rawErrorBody;
      }
    }

    const apiError: ApiError = {
      message: `Request failed (${response.status} ${response.statusText})`,
      statusCode: response.status,
    };

    if (parsedErrorBody && typeof parsedErrorBody === 'object') {
      const candidate = parsedErrorBody as Record<string, unknown>;
      if (typeof candidate.message === 'string') {
        apiError.message = candidate.message;
      }
      if (typeof candidate.error === 'string') {
        apiError.error = candidate.error;
      }
      if ('details' in candidate) {
        apiError.details = candidate.details;
      }
      if (apiError.details === undefined) {
        apiError.details = parsedErrorBody;
      }
    } else if (typeof parsedErrorBody === 'string' && parsedErrorBody) {
      apiError.message = parsedErrorBody;
    }

    throw apiError;
  }

  if (contentType.includes('application/json')) {
    return (await response.json()) as T;
  }

  return (await response.text()) as T;
}
