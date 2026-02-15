import { describe, expect, it } from 'vitest';
import { resolveHostRoute } from './middleware';

describe('resolveHostRoute', () => {
  const baseDomain = 'gymstack.club';

  it('rewrites admin host root to /_admin', () => {
    expect(resolveHostRoute('admin.gymstack.club', '/', baseDomain)).toEqual({ type: 'rewrite', pathname: '/_admin' });
  });

  it('rewrites admin host nested path under /_admin', () => {
    expect(resolveHostRoute('admin.gymstack.club', '/tenants', baseDomain)).toEqual({ type: 'rewrite', pathname: '/_admin/tenants' });
  });

  it('rewrites tenant subdomains to /_sites/[slug]', () => {
    expect(resolveHostRoute('acme.gymstack.club', '/', baseDomain)).toEqual({ type: 'rewrite', pathname: '/_sites/acme/' });
  });

  it('keeps root host untouched', () => {
    expect(resolveHostRoute('www.gymstack.club', '/', baseDomain)).toEqual({ type: 'next' });
    expect(resolveHostRoute('gymstack.club', '/', baseDomain)).toEqual({ type: 'next' });
  });

  it('does not treat reserved subdomains as tenants', () => {
    expect(resolveHostRoute('api.gymstack.club', '/', baseDomain)).toEqual({ type: 'next' });
  });

  it('rewrites custom domains to /_custom/[host]', () => {
    expect(resolveHostRoute('tenant-brand.com', '/join', baseDomain)).toEqual({
      type: 'rewrite',
      pathname: '/_custom/tenant-brand.com/join',
    });
  });
});
