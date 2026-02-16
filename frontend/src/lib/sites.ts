import { apiFetch } from './apiFetch';
import { toOptionalString } from './safe';

export type PublicLocation = {
  id: string;
  slug: string;
  displayName: string;
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

export type PublicLocationResponse = {
  location: PublicLocation | null;
  tenant: TenantBranding | null;
};

type PublicLocationBySlugResponse = PublicLocationResponse & {
  tenantId: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parsePublicLocation(value: unknown): PublicLocation | null {
  if (value === null) {
    return null;
  }

  if (!isRecord(value)) {
    throw new Error('Invalid public location payload');
  }

  const id = toOptionalString(value.id);
  const slug = toOptionalString(value.slug);
  const displayName = toOptionalString(value.displayName);

  if (!id || !slug || !displayName) {
    throw new Error('Invalid public location payload');
  }

  return {
    id,
    slug,
    displayName,
    logoUrl: toOptionalString(value.logoUrl) ?? null,
    primaryColor: toOptionalString(value.primaryColor) ?? null,
    accentGradient: toOptionalString(value.accentGradient) ?? null,
    heroTitle: toOptionalString(value.heroTitle) ?? null,
    heroSubtitle: toOptionalString(value.heroSubtitle) ?? null,
  };
}

function parseTenantBranding(value: unknown): TenantBranding | null {
  if (value === null) {
    return null;
  }

  if (!isRecord(value)) {
    throw new Error('Invalid tenant payload');
  }

  const id = toOptionalString(value.id);
  const whiteLabelEnabled = value.whiteLabelEnabled;

  if (!id || typeof whiteLabelEnabled !== 'boolean') {
    throw new Error('Invalid tenant payload');
  }

  return {
    id,
    whiteLabelEnabled,
  };
}

function parsePublicLocationResponse(value: unknown): PublicLocationResponse {
  if (!isRecord(value)) {
    throw new Error('Invalid public location response');
  }

  return {
    location: parsePublicLocation(value.location),
    tenant: parseTenantBranding(value.tenant),
  };
}

function isPublicLocationBySlugResponse(value: unknown): value is PublicLocationBySlugResponse {
  if (!isRecord(value)) {
    return false;
  }

  if (typeof value.tenantId !== 'string') {
    return false;
  }

  try {
    parsePublicLocationResponse(value);
    return true;
  } catch {
    return false;
  }
}

function isPublicLocationResponse(value: unknown): value is PublicLocationResponse {
  try {
    parsePublicLocationResponse(value);
    return true;
  } catch {
    return false;
  }
}

export async function getPublicLocationBySlug(slug: string): Promise<PublicLocationBySlugResponse> {
  return apiFetch<PublicLocationBySlugResponse>(
    `/api/public/locations/by-slug/${encodeURIComponent(slug)}`,
    {},
    isPublicLocationBySlugResponse,
  );
}

export async function getPublicLocationByHost(host?: string): Promise<PublicLocationResponse> {
  const query = host ? `?host=${encodeURIComponent(host)}` : '';
  return apiFetch<PublicLocationResponse>(`/api/public/location-by-host${query}`, {}, isPublicLocationResponse);
}

export async function resolvePublicSite(host: string): Promise<{ kind: 'location' | 'tenant'; tenant: { id: string; name: string }; location?: PublicLocation; branding: PublicLocation; tenantFeature?: TenantBranding }> {
  return apiFetch(`/api/public/sites/resolve?host=${encodeURIComponent(host)}`);
}
