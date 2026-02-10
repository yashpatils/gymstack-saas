export function getApiBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) {
    throw new Error(
      'NEXT_PUBLIC_API_URL is not set. Add it in your frontend environment configuration.',
    );
  }

  return base.replace(/\/+$/, '');
}

export async function apiFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const base = getApiBaseUrl();
  const token =
    typeof window !== 'undefined'
      ? window.localStorage.getItem('accessToken')
      : null;

  const urlPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${base}${urlPath}`;

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
    window.localStorage.removeItem('accessToken');
    window.location.assign('/login');
  }

  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;

    try {
      const data = (await response.json()) as { message?: string };
      if (data?.message) {
        message = data.message;
      }
    } catch {
      // Ignore non-JSON error bodies and keep the default message.
    }

    throw new Error(message);
  }

  return response;
}
