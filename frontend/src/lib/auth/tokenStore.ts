const ACCESS_TOKEN_STORAGE_KEY = 'gymstack_token';
const REFRESH_TOKEN_STORAGE_KEY = 'gymstack_refresh_token';
const ACCESS_TOKEN_COOKIE_NAME = 'gymstack_token';
const REFRESH_TOKEN_COOKIE_NAME = 'gymstack_refresh_token';
const ADMIN_ACCESS_TOKEN_STORAGE_KEY = 'gymstack_admin_token';
const ADMIN_REFRESH_TOKEN_STORAGE_KEY = 'gymstack_admin_refresh_token';
const ADMIN_SESSION_STARTED_AT_KEY = 'gymstack_admin_session_started_at';
const ADMIN_HOST = 'admin.gymstack.club';
const ADMIN_SESSION_MAX_AGE_MS = 15 * 60 * 1000;

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

function isAdminHost(): boolean {
  if (isServer()) {
    return false;
  }

  return window.location.hostname.toLowerCase() === ADMIN_HOST;
}

function isAdminSessionExpired(): boolean {
  if (isServer() || !isAdminHost()) {
    return false;
  }

  const startedAtRaw = window.sessionStorage.getItem(ADMIN_SESSION_STARTED_AT_KEY);
  if (!startedAtRaw) {
    return false;
  }

  const startedAt = Number.parseInt(startedAtRaw, 10);
  if (!Number.isFinite(startedAt)) {
    return false;
  }

  return Date.now() - startedAt > ADMIN_SESSION_MAX_AGE_MS;
}

function clearAdminSessionStorage(): void {
  if (isServer()) {
    return;
  }

  window.sessionStorage.removeItem(ADMIN_ACCESS_TOKEN_STORAGE_KEY);
  window.sessionStorage.removeItem(ADMIN_REFRESH_TOKEN_STORAGE_KEY);
  window.sessionStorage.removeItem(ADMIN_SESSION_STARTED_AT_KEY);
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

  if (isAdminHost()) {
    if (isAdminSessionExpired()) {
      clearAdminSessionStorage();
      clearCookie(ACCESS_TOKEN_COOKIE_NAME);
      clearCookie(REFRESH_TOKEN_COOKIE_NAME);
      return null;
    }

    const adminToken = window.sessionStorage.getItem(ADMIN_ACCESS_TOKEN_STORAGE_KEY);
    if (adminToken) {
      inMemoryAccessToken = adminToken;
      return adminToken;
    }

    const cookieToken = parseCookieValue(ACCESS_TOKEN_COOKIE_NAME);
    if (cookieToken) {
      inMemoryAccessToken = cookieToken;
      window.sessionStorage.setItem(ADMIN_ACCESS_TOKEN_STORAGE_KEY, cookieToken);
      window.sessionStorage.setItem(ADMIN_SESSION_STARTED_AT_KEY, Date.now().toString());
      return cookieToken;
    }

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

  if (isAdminHost()) {
    if (isAdminSessionExpired()) {
      clearAdminSessionStorage();
      clearCookie(ACCESS_TOKEN_COOKIE_NAME);
      clearCookie(REFRESH_TOKEN_COOKIE_NAME);
      return null;
    }

    const adminRefreshToken = window.sessionStorage.getItem(ADMIN_REFRESH_TOKEN_STORAGE_KEY);
    if (adminRefreshToken) {
      return adminRefreshToken;
    }

    const refreshCookieToken = parseCookieValue(REFRESH_TOKEN_COOKIE_NAME);
    if (refreshCookieToken) {
      window.sessionStorage.setItem(ADMIN_REFRESH_TOKEN_STORAGE_KEY, refreshCookieToken);
      return refreshCookieToken;
    }

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

  if (isAdminHost()) {
    window.sessionStorage.setItem(ADMIN_ACCESS_TOKEN_STORAGE_KEY, accessToken);
    window.sessionStorage.setItem(ADMIN_SESSION_STARTED_AT_KEY, Date.now().toString());
    writeCookie(ACCESS_TOKEN_COOKIE_NAME, accessToken, ADMIN_SESSION_MAX_AGE_MS / 1000);
    if (refreshToken) {
      window.sessionStorage.setItem(ADMIN_REFRESH_TOKEN_STORAGE_KEY, refreshToken);
      writeCookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, ADMIN_SESSION_MAX_AGE_MS / 1000);
    }
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

  if (isAdminHost()) {
    clearAdminSessionStorage();
    clearCookie(ACCESS_TOKEN_COOKIE_NAME);
    clearCookie(REFRESH_TOKEN_COOKIE_NAME);
    return;
  }

  window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  clearCookie(ACCESS_TOKEN_COOKIE_NAME);
  clearCookie(REFRESH_TOKEN_COOKIE_NAME);
}
