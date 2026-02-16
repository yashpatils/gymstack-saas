import { headers } from 'next/headers';
import { toOptionalString } from '@/src/lib/safe';
import type { PublicLocationByHostResponse } from '@/src/types/public';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseLocation(value: unknown): PublicLocationByHostResponse['location'] {
  if (value === null) {
    return null;
  }

  if (!isRecord(value)) {
    throw new Error('Invalid location payload');
  }

  const id = toOptionalString(value.id);
  const slug = toOptionalString(value.slug);
  const displayName = toOptionalString(value.displayName);

  if (!id || !slug || !displayName) {
    throw new Error('Invalid location payload');
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

function parseTenant(value: unknown): PublicLocationByHostResponse['tenant'] {
  if (value === null) {
    return null;
  }

  if (!isRecord(value)) {
    throw new Error('Invalid tenant payload');
  }

  const id = toOptionalString(value.id);
  if (!id || typeof value.whiteLabelEnabled !== 'boolean') {
    throw new Error('Invalid tenant payload');
  }

  return {
    id,
    whiteLabelEnabled: value.whiteLabelEnabled,
  };
}

function parsePublicLocationByHost(value: unknown): PublicLocationByHostResponse {
  if (!isRecord(value)) {
    throw new Error('Invalid public host response');
  }

  return {
    location: parseLocation(value.location),
    tenant: parseTenant(value.tenant),
  };
}

export async function getLocationByHost(): Promise<PublicLocationByHostResponse> {
  const headerStore = await headers();
  const host = headerStore.get('host');

  if (!host) {
    return { location: null, tenant: null };
  }

  const proto = headerStore.get('x-forwarded-proto') ?? 'http';
  const endpoint = `${proto}://${host}/api/public/location-by-host`;
  const response = await fetch(endpoint, {
    cache: 'no-store',
    headers: { host },
  });

  if (!response.ok) {
    throw new Error(`Failed to load location for host (${response.status})`);
  }

  const payload: unknown = await response.json();
  return parsePublicLocationByHost(payload);
}
