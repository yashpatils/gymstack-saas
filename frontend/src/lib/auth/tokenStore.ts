const ACCESS_TOKEN_STORAGE_KEY = 'gymstack_token';
const REFRESH_TOKEN_STORAGE_KEY = 'gymstack_refresh_token';
const ACCESS_TOKEN_COOKIE_NAME = 'gymstack_token';
const REFRESH_TOKEN_COOKIE_NAME = 'gymstack_refresh_token';

type AuthTokens = {
  accessToken: string;
  refreshToken?: string;
};

let inMemoryAccessToken: string | null = null;

function isServer(): boolean {
  return typeof window === 'undefined';
}

function isProductionHost(hostname: string): boolean {
  return hostname === 'gymstack.club' || hostname.endsWith('.gymstack.club');
}

function getCookieDomain(): string | null {
  if (isServer()) {
    return null;
  }

  return isProductionHost(window.location.hostname.toLowerCase()) ? '.gymstack.club' : null;
}

function parseCookieValue(cookieName: string): string | null {
  if (isServer()) {
    return null;
  }

  const cookies = document.cookie ? document.cookie.split('; ') : [];
  for (const cookieEntry of cookies) {
    if (!cookieEntry.startsWith(`${cookieName}=`)) {
      continue;
    }

    const encodedValue = cookieEntry.slice(cookieName.length + 1);
    try {
      return decodeURIComponent(encodedValue);
    } catch {
      return encodedValue;
    }
  }

  return null;
}

function writeCookie(name: string, value: string, maxAgeSeconds: number): void {
  if (isServer()) {
    return;
  }

  const domain = getCookieDomain();
  const secure = window.location.protocol === 'https:';
  const segments = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    `Max-Age=${maxAgeSeconds}`,
    'SameSite=Lax',
  ];

  if (domain) {
    segments.push(`Domain=${domain}`);
  }

  if (secure) {
    segments.push('Secure');
  }

  document.cookie = segments.join('; ');
}

function clearCookie(name: string): void {
  if (isServer()) {
    return;
  }

  const secure = window.location.protocol === 'https:';
  const clearSegments = [
    `${name}=`,
    'Path=/',
    'Max-Age=0',
    'SameSite=Lax',
  ];

  if (secure) {
    clearSegments.push('Secure');
  }

  document.cookie = clearSegments.join('; ');

  const domain = getCookieDomain();
  if (domain) {
    const domainSegments = [...clearSegments, `Domain=${domain}`];
    document.cookie = domainSegments.join('; ');
  }
}

export function getAccessToken(): string | null {
  if (inMemoryAccessToken) {
    return inMemoryAccessToken;
  }

  if (isServer()) {
    return null;
  }

  const storedToken = window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  if (storedToken) {
    inMemoryAccessToken = storedToken;
    return storedToken;
  }

  const cookieToken = parseCookieValue(ACCESS_TOKEN_COOKIE_NAME);
  if (cookieToken) {
    inMemoryAccessToken = cookieToken;
    window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, cookieToken);
    return cookieToken;
  }

  return null;
}

export function getRefreshToken(): string | null {
  if (isServer()) {
    return null;
  }

  const storedRefreshToken = window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  if (storedRefreshToken) {
    return storedRefreshToken;
  }

  const refreshCookieToken = parseCookieValue(REFRESH_TOKEN_COOKIE_NAME);
  if (refreshCookieToken) {
    window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshCookieToken);
    return refreshCookieToken;
  }

  return null;
}

export function setTokens({ accessToken, refreshToken }: AuthTokens): void {
  inMemoryAccessToken = accessToken;

  if (isServer()) {
    return;
  }

  window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken);
  writeCookie(ACCESS_TOKEN_COOKIE_NAME, accessToken, 60 * 60 * 24 * 30);
  if (refreshToken) {
    window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
    writeCookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, 60 * 60 * 24 * 30);
  }
}

export function clearTokens(): void {
  inMemoryAccessToken = null;

  if (isServer()) {
    return;
  }

  window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  clearCookie(ACCESS_TOKEN_COOKIE_NAME);
  clearCookie(REFRESH_TOKEN_COOKIE_NAME);
}
