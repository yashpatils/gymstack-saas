const ACCESS_TOKEN_STORAGE_KEY = 'gymstack_token';
const REFRESH_TOKEN_STORAGE_KEY = 'gymstack_refresh_token';

type AuthTokens = {
  accessToken: string;
  refreshToken?: string;
};

let inMemoryAccessToken: string | null = null;

function isServer(): boolean {
  return typeof window === 'undefined';
}

export function getAccessToken(): string | null {
  if (inMemoryAccessToken) {
    return inMemoryAccessToken;
  }

  if (isServer()) {
    return null;
  }

  const storedToken = window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  inMemoryAccessToken = storedToken;
  return storedToken;
}

export function getRefreshToken(): string | null {
  if (isServer()) {
    return null;
  }

  return window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
}

export function setTokens({ accessToken, refreshToken }: AuthTokens): void {
  inMemoryAccessToken = accessToken;

  if (isServer()) {
    return;
  }

  window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken);
  if (refreshToken) {
    window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
  }
}

export function clearTokens(): void {
  inMemoryAccessToken = null;

  if (isServer()) {
    return;
  }

  window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
}
