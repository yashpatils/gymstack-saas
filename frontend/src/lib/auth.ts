const TOKEN_STORAGE_KEY = 'gymstack_token';

export type AuthUser = {
  id: string;
  email: string;
  role: string;
};

type AuthResponse = {
  accessToken: string;
  user: AuthUser;
};

function getApiUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) {
    throw new Error('NEXT_PUBLIC_API_URL is missing.');
  }

  const normalizedBase = base.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${normalizedBase}${normalizedPath}`;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

function setToken(token: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;

    try {
      const body = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(body.message)) {
        message = body.message.join(', ');
      } else if (typeof body.message === 'string') {
        message = body.message;
      }
    } catch {
      // Keep default message for non-JSON responses.
    }

    throw new Error(message);
  }

  return (await response.json()) as T;
}

export async function login(
  email: string,
  password: string,
): Promise<{ token: string; user: AuthUser }> {
  const response = await fetch(getApiUrl('/api/auth/login'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await parseResponse<AuthResponse>(response);
  setToken(data.accessToken);

  return {
    token: data.accessToken,
    user: data.user,
  };
}

export async function signup(
  email: string,
  password: string,
): Promise<{ token: string; user: AuthUser }> {
  const response = await fetch(getApiUrl('/api/auth/signup'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await parseResponse<AuthResponse>(response);
  setToken(data.accessToken);

  return {
    token: data.accessToken,
    user: data.user,
  };
}

export async function me(): Promise<AuthUser> {
  const token = getToken();
  if (!token) {
    throw new Error('Not authenticated.');
  }

  const response = await fetch(getApiUrl('/api/auth/me'), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse<AuthUser>(response);
}

export function logout(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}
