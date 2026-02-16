import { apiFetch } from './apiFetch';

export type PublicLocation = {
  id: string;
  slug: string;
  name: string;
  displayName?: string | null;
  address?: string | null;
  timezone?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  accentGradient?: string | null;
  heroTitle?: string | null;
  heroSubtitle?: string | null;
};

export type TenantBranding = {
  id: string;
  whiteLabelEnabled: boolean;
};

export async function getPublicLocationBySlug(slug: string): Promise<{ location: PublicLocation; branding: PublicLocation; tenant: TenantBranding; tenantId: string }> {
  return apiFetch(`/api/public/locations/by-slug/${encodeURIComponent(slug)}`);
}

export async function getPublicLocationByHost(host?: string): Promise<{ location: PublicLocation | null; tenant: TenantBranding | null }> {
  const query = host ? `?host=${encodeURIComponent(host)}` : '';
  return apiFetch(`/api/public/location-by-host${query}`);
}

export async function resolvePublicSite(host: string): Promise<{ kind: 'location' | 'tenant'; tenant: { id: string; name: string }; location?: PublicLocation; branding: PublicLocation; tenantFeature?: TenantBranding }> {
  return apiFetch(`/api/public/sites/resolve?host=${encodeURIComponent(host)}`);
}
