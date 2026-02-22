import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { RESERVED_SUBDOMAINS } from './src/lib/slug';
import { getAdminHost, getBaseDomain } from './src/lib/domainConfig';

const PUBLIC_FILE = /\.(.*)$/;
const ADMIN_PUBLIC_ROUTES = [
  '/admin',
  '/login',
  '/reset-password',
  '/verify-email',
  '/api',
  '/favicon.ico',
  '/_next',
  '/robots.txt',
  '/sitemap.xml',
];
const PROTECTED_APP_PATH_PREFIXES = ['/platform', '/admin', '/_admin'];
const AUTH_TOKEN_COOKIE = 'gymstack_token';
const REFRESH_TOKEN_COOKIE = 'gymstack_refresh_token';

type HostRouteResolution =
  | { type: 'next' }
  | { type: 'rewrite'; pathname: string }
  | { type: 'redirect'; pathname: string; search?: string };

function stripPort(host: string): string {
  return host.split(':')[0] ?? host;
}

function shouldBypass(pathname: string): boolean {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/assets') ||
    PUBLIC_FILE.test(pathname)
  );
}

function isAdminHost(host: string, baseDomain: string): boolean {
  return host === getAdminHost() || host === `admin.${baseDomain}`;
}

function isRootHost(host: string, baseDomain: string): boolean {
  return host === baseDomain || host === `www.${baseDomain}` || host === 'localhost';
}

function getSubdomain(host: string, baseDomain: string): string | null {
  if (host.endsWith(`.${baseDomain}`)) {
    return host.slice(0, -(baseDomain.length + 1));
  }

  if (host.endsWith('.localhost')) {
    return host.slice(0, -'.localhost'.length);
  }

  return null;
}

function isAdminPublicRoute(pathname: string): boolean {
  return ADMIN_PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}


function isAdminLoginAlias(pathname: string): boolean {
  return pathname === '/admin/login' || pathname.startsWith('/admin/login/');
}

function isSignupPath(pathname: string): boolean {
  return pathname === '/signup' || pathname.startsWith('/signup/');
}

function isProtectedAppPath(pathname: string): boolean {
  return PROTECTED_APP_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function hasSessionCookie(request: NextRequest): boolean {
  return Boolean(request.cookies.get(AUTH_TOKEN_COOKIE)?.value || request.cookies.get(REFRESH_TOKEN_COOKIE)?.value);
}

export function resolveHostRoute(host: string, pathname: string, baseDomain: string): HostRouteResolution {
  if (isAdminHost(host, baseDomain)) {
    if (isSignupPath(pathname)) {
      return { type: 'redirect', pathname: '/login' };
    }

    if (isAdminLoginAlias(pathname)) {
      return { type: 'redirect', pathname: '/login', search: '?next=/admin' };
    }

    if (pathname === '/') {
      return { type: 'redirect', pathname: '/admin' };
    }

    if (isAdminPublicRoute(pathname)) {
      return { type: 'next' };
    }

    return { type: 'next' };
  }

  if (pathname.startsWith('/_sites') || pathname.startsWith('/_custom')) {
    return { type: 'next' };
  }

  if (isProtectedAppPath(pathname)) {
    return { type: 'next' };
  }

  if (isRootHost(host, baseDomain)) {
    return { type: 'next' };
  }

  const slug = getSubdomain(host, baseDomain);
  if (slug) {
    if (RESERVED_SUBDOMAINS.has(slug)) {
      return { type: 'next' };
    }

    return { type: 'rewrite', pathname: `/_sites/${slug}${pathname}` };
  }

  return { type: 'rewrite', pathname: `/_custom/${encodeURIComponent(host)}${pathname}` };
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (shouldBypass(pathname)) {
    return NextResponse.next();
  }

  if (isProtectedAppPath(pathname) && !hasSessionCookie(request)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.search = `?next=${encodeURIComponent(`${pathname}${request.nextUrl.search}`)}`;
    return NextResponse.redirect(loginUrl);
  }

  const baseDomain = getBaseDomain();
  const hostHeader = request.headers.get('host') ?? '';
  const host = stripPort(hostHeader.toLowerCase());
  const resolution = resolveHostRoute(host, pathname, baseDomain);
  if (resolution.type === 'next') {
    return NextResponse.next();
  }

  if (resolution.type === 'redirect') {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = resolution.pathname;
    redirectUrl.search = resolution.search ?? '';
    return NextResponse.redirect(redirectUrl);
  }

  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = resolution.pathname;
  return NextResponse.rewrite(rewriteUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
