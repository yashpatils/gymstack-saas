import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_FILE = /\.(.*)$/;
const ADMIN_HOST = 'admin.gymstack.club';
const ADMIN_PUBLIC_ROUTES = [
  '/login',
  '/signup',
  '/reset-password',
  '/verify-email',
  '/api',
  '/favicon.ico',
  '/_next',
  '/robots.txt',
  '/sitemap.xml',
];
export const RESERVED_SUBDOMAINS = new Set(['admin', 'www', 'api', 'app', 'static']);

type HostRouteResolution =
  | { type: 'next' }
  | { type: 'rewrite'; pathname: string };

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

function getBaseDomain(): string {
  return (process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'localhost').toLowerCase();
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

function adminPathname(pathname: string): string {
  return pathname === '/' ? '/_admin' : `/_admin${pathname}`;
}

function isAdminPublicRoute(pathname: string): boolean {
  return ADMIN_PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function resolveHostRoute(host: string, pathname: string, baseDomain: string): HostRouteResolution {
  if (pathname.startsWith('/_sites') || pathname.startsWith('/_custom') || pathname.startsWith('/_admin')) {
    return { type: 'next' };
  }

  if (host === ADMIN_HOST) {
    if (isAdminPublicRoute(pathname)) {
      return { type: 'next' };
    }

    return { type: 'rewrite', pathname: adminPathname(pathname) };
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

  const baseDomain = getBaseDomain();
  const hostHeader = request.headers.get('host') ?? '';
  const host = stripPort(hostHeader.toLowerCase());

  const resolution = resolveHostRoute(host, pathname, baseDomain);
  if (resolution.type === 'next') {
    return NextResponse.next();
  }

  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = resolution.pathname;
  return NextResponse.rewrite(rewriteUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
