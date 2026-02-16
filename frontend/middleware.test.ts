import { describe, expect, it } from 'vitest';
import { resolveHostRoute } from './middleware';

describe('resolveHostRoute', () => {
  const baseDomain = 'gymstack.club';

  it('redirects admin host root to /admin', () => {
    expect(resolveHostRoute('admin.gymstack.club', '/', baseDomain)).toEqual({ type: 'redirect', pathname: '/admin' });
  });

  it('keeps admin host /admin routes untouched', () => {
    expect(resolveHostRoute('admin.gymstack.club', '/admin/tenants', baseDomain)).toEqual({ type: 'next' });
  });


  it('keeps dedicated host login route untouched', () => {
    expect(resolveHostRoute('admin.gymstack.club', '/login', baseDomain)).toEqual({ type: 'next' });
  });

  it('redirects admin signup to login', () => {
    expect(resolveHostRoute('admin.gymstack.club', '/signup', baseDomain)).toEqual({ type: 'redirect', pathname: '/login' });
  });


  it('keeps admin next and api routes untouched', () => {
    expect(resolveHostRoute('admin.gymstack.club', '/_next/static/chunk.js', baseDomain)).toEqual({ type: 'next' });
    expect(resolveHostRoute('admin.gymstack.club', '/api/health', baseDomain)).toEqual({ type: 'next' });
  });

  it('rewrites tenant subdomains to /_sites/[slug]', () => {
    expect(resolveHostRoute('acme.gymstack.club', '/', baseDomain)).toEqual({ type: 'rewrite', pathname: '/_sites/acme/' });
  });

  it('keeps root host untouched', () => {
    expect(resolveHostRoute('www.gymstack.club', '/', baseDomain)).toEqual({ type: 'next' });
    expect(resolveHostRoute('gymstack.club', '/', baseDomain)).toEqual({ type: 'next' });
  });

  it('does not treat reserved subdomains as tenants', () => {
    expect(resolveHostRoute('admin.gymstack.club', '/', baseDomain)).toEqual({ type: 'redirect', pathname: '/admin' });
    for (const subdomain of ['www', 'api', 'app', 'static']) {
      expect(resolveHostRoute(`${subdomain}.gymstack.club`, '/', baseDomain)).toEqual({ type: 'next' });
    }
  });

  it('rewrites custom domains to /_custom/[host]', () => {
    expect(resolveHostRoute('tenant-brand.com', '/join', baseDomain)).toEqual({
      type: 'rewrite',
      pathname: '/_custom/tenant-brand.com/join',
    });
  });
});
