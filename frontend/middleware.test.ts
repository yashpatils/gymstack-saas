import { describe, expect, it } from 'vitest';
import { resolveHostRoute } from './middleware';

describe('resolveHostRoute', () => {
  const baseDomain = 'gymstack.club';

  it('rewrites admin host root to /_admin', () => {
    expect(resolveHostRoute('admin.gymstack.club', '/', baseDomain, true)).toEqual({ type: 'rewrite', pathname: '/_admin' });
  });

  it('rewrites admin host nested path under /_admin', () => {
    expect(resolveHostRoute('admin.gymstack.club', '/tenants', baseDomain, true)).toEqual({ type: 'rewrite', pathname: '/_admin/tenants' });
  });


  it('keeps admin login route untouched', () => {
    expect(resolveHostRoute('admin.gymstack.club', '/login', baseDomain, false)).toEqual({ type: 'next' });
  });


  it('redirects admin signup to login', () => {
    expect(resolveHostRoute('admin.gymstack.club', '/signup', baseDomain, false)).toEqual({ type: 'redirect', pathname: '/login' });
  });

  it('redirects unauthenticated admin dashboard traffic to login', () => {
    expect(resolveHostRoute('admin.gymstack.club', '/', baseDomain, false)).toEqual({ type: 'redirect', pathname: '/login' });
  });

  it('keeps admin next and api routes untouched', () => {
    expect(resolveHostRoute('admin.gymstack.club', '/_next/static/chunk.js', baseDomain, false)).toEqual({ type: 'next' });
    expect(resolveHostRoute('admin.gymstack.club', '/api/health', baseDomain, false)).toEqual({ type: 'next' });
  });

  it('rewrites tenant subdomains to /_sites/[slug]', () => {
    expect(resolveHostRoute('acme.gymstack.club', '/', baseDomain, false)).toEqual({ type: 'rewrite', pathname: '/_sites/acme/' });
  });

  it('keeps root host untouched', () => {
    expect(resolveHostRoute('www.gymstack.club', '/', baseDomain, false)).toEqual({ type: 'next' });
    expect(resolveHostRoute('gymstack.club', '/', baseDomain, false)).toEqual({ type: 'next' });
  });

  it('does not treat reserved subdomains as tenants', () => {
    for (const subdomain of ['www', 'api', 'app', 'static']) {
      expect(resolveHostRoute(`${subdomain}.gymstack.club`, '/', baseDomain, false)).toEqual({ type: 'next' });
    }
  });

  it('rewrites custom domains to /_custom/[host]', () => {
    expect(resolveHostRoute('tenant-brand.com', '/join', baseDomain, false)).toEqual({
      type: 'rewrite',
      pathname: '/_custom/tenant-brand.com/join',
    });
  });
});
