import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_FILE = /\.(.*)$/;

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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (shouldBypass(pathname)) {
    return NextResponse.next();
  }

  const baseDomain = getBaseDomain();
  const hostHeader = request.headers.get('host') ?? '';
  const host = stripPort(hostHeader.toLowerCase());

  if (pathname.startsWith('/platform')) {
    const token = request.cookies.get('gymstack_token')?.value;
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  if (pathname.startsWith('/_sites') || pathname.startsWith('/_custom') || isRootHost(host, baseDomain)) {
    return NextResponse.next();
  }

  const slug = getSubdomain(host, baseDomain);
  if (slug) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = `/_sites/${slug}${pathname}`;
    return NextResponse.rewrite(rewriteUrl);
  }

  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = `/_custom/${encodeURIComponent(host)}${pathname}`;
  return NextResponse.rewrite(rewriteUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
