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

  let shouldSetJsonContentType = false;
  if (!headers.has('Content-Type') && typeof options.body === 'string') {
    try {
      JSON.parse(options.body);
      shouldSetJsonContentType = true;
    } catch {
      shouldSetJsonContentType = false;
    }
  }

  if (shouldSetJsonContentType) {
    headers.set('Content-Type', 'application/json');
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

  if (!response.ok) {
    let message = `Request failed (${response.status} ${response.statusText})`;

    try {
      const data = (await response.json()) as {
        error?: string;
        message?: string | string[];
      };

      if (data?.error) {
        message = data.error;
      }

      if (Array.isArray(data?.message)) {
        message = data.message.join(', ');
      } else if (data?.message) {
        message = data.message;
      }
    } catch {
      // Ignore non-JSON error bodies and keep the default message.
    }

    throw new Error(`${message} [${response.status}]`);
  }

  return parsedBody as T;
}
