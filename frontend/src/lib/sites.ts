import { apiFetch } from './apiFetch';

export type PublicLocation = {
  id: string;
  slug: string;
  name: string;
  displayName?: string | null;
  address?: string | null;
  timezone?: string | null;
};

export type PublicBranding = {
  logoUrl?: string | null;
  accentColor?: string | null;
  heroImageUrl?: string | null;
};

export async function getPublicLocationBySlug(slug: string): Promise<{ location: PublicLocation; branding: PublicBranding; tenantId: string }> {
  return apiFetch(`/api/public/locations/by-slug/${encodeURIComponent(slug)}`);
}

export async function resolvePublicSite(host: string): Promise<{ kind: 'location' | 'tenant'; tenant: { id: string; name: string }; location?: PublicLocation; branding: PublicBranding }> {
  return apiFetch(`/api/public/sites/resolve?host=${encodeURIComponent(host)}`);
}
