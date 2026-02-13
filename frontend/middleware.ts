import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const LOCALHOST_HOSTNAMES = new Set(['localhost', '127.0.0.1']);
const INTERNAL_PATH_PREFIXES = ['/api', '/_next', '/static', '/favicon.ico'];

function stripPort(host: string): string {
  return host.split(':')[0]?.toLowerCase() ?? '';
}

function getBaseDomain(): string {
  return (process.env.NEXT_PUBLIC_BASE_DOMAIN ?? '').trim().toLowerCase();
}

function getLocationSlugFromHost(hostHeader: string): string | null {
  const normalizedHost = stripPort(hostHeader);
  const baseDomain = getBaseDomain();

  if (baseDomain && normalizedHost.endsWith(`.${baseDomain}`)) {
    const slug = normalizedHost.slice(0, -1 * (baseDomain.length + 1));
    return slug && !slug.includes('.') ? slug : null;
  }

  if (normalizedHost.endsWith('.localhost') || normalizedHost.endsWith('.127.0.0.1')) {
    const [slug, parent] = normalizedHost.split('.', 2);
    if (slug && parent && LOCALHOST_HOSTNAMES.has(parent)) {
      return slug;
    }
  }

  return null;
}

function isInternalPath(pathname: string): boolean {
  return INTERNAL_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function rewriteSitesPath(request: NextRequest): NextResponse | null {
  const siteMatch = request.nextUrl.pathname.match(/^\/_sites\/([^/]+)(\/.*)?$/);
  if (!siteMatch) {
    return null;
  }

  const slug = siteMatch[1];
  const remainder = siteMatch[2] ?? '';
  const targetUrl = request.nextUrl.clone();
  targetUrl.pathname = `/${slug}${remainder}`;
  return NextResponse.rewrite(targetUrl);
}

function rewriteSubdomainRequest(request: NextRequest): NextResponse | null {
  if (isInternalPath(request.nextUrl.pathname) || request.nextUrl.pathname.startsWith('/platform')) {
    return null;
  }

  const hostHeader = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (!hostHeader) {
    return null;
  }

  const slug = getLocationSlugFromHost(hostHeader);
  if (!slug) {
    return null;
  }

  const targetUrl = request.nextUrl.clone();
  targetUrl.pathname = `/${slug}${request.nextUrl.pathname}`;
  return NextResponse.rewrite(targetUrl);
}

export function middleware(request: NextRequest) {
  const rewriteForSitesPath = rewriteSitesPath(request);
  if (rewriteForSitesPath) {
    return rewriteForSitesPath;
  }

  const rewriteForSubdomain = rewriteSubdomainRequest(request);
  if (rewriteForSubdomain) {
    return rewriteForSubdomain;
  }

  if (request.nextUrl.pathname.startsWith('/platform')) {
    const token = request.cookies.get('gymstack_token')?.value;
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
