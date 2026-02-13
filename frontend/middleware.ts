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
    PUBLIC_FILE.test(pathname)
  );
}

function isRootHost(host: string, baseDomain: string): boolean {
  return host === baseDomain || host === `www.${baseDomain}` || host.endsWith('.vercel.app');
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (shouldBypass(pathname)) {
    return NextResponse.next();
  }

  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'localhost';
  const hostHeader = request.headers.get('host') ?? '';
  const host = stripPort(hostHeader.toLowerCase());

  if (pathname.startsWith('/platform')) {
    const token = request.cookies.get('gymstack_token')?.value;
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  const isLocalhost = host.endsWith('.localhost');
  const isSubdomain = host.endsWith(`.${baseDomain}`) || isLocalhost;

  if (isRootHost(host, baseDomain) || pathname.startsWith('/_sites') || pathname.startsWith('/_custom')) {
    return NextResponse.next();
  }

  if (isSubdomain) {
    const slug = host.split('.')[0];
    if (slug) {
      const rewriteUrl = request.nextUrl.clone();
      rewriteUrl.pathname = `/_sites/${slug}${pathname}`;
      return NextResponse.rewrite(rewriteUrl);
    }
  }

  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = `/_custom/${encodeURIComponent(host)}${pathname}`;
  return NextResponse.rewrite(rewriteUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
