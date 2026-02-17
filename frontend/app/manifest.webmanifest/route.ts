import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

type HostData = {
  location: { displayName: string; primaryColor: string | null } | null;
};

function resolveBackendBaseUrl(): string {
  return (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000').trim().replace(/\/+$/, '');
}

export async function GET(): Promise<NextResponse> {
  const headerStore = headers();
  const host = headerStore.get('host') ?? '';

  let brandName = 'Gym Stack';
  let themeColor = '#0f172a';

  try {
    const locationLookup = new URL('/api/public/location-by-host', resolveBackendBaseUrl());
    if (host) {
      locationLookup.searchParams.set('host', host);
    }

    const response = await fetch(locationLookup.toString(), {
      headers: { host, 'x-forwarded-host': host },
      cache: 'force-cache',
    });

    if (response.ok) {
      const payload = (await response.json()) as HostData;
      if (payload.location?.displayName) {
        brandName = payload.location.displayName;
      }
      if (payload.location?.primaryColor) {
        themeColor = payload.location.primaryColor;
      }
    }
  } catch {
    // fallback defaults
  }

  const manifest = {
    name: brandName,
    short_name: brandName,
    description: 'Gym Stack location app',
    start_url: '/app',
    display: 'standalone',
    background_color: '#020617',
    theme_color: themeColor,
    icons: [
      { src: '/icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any maskable' },
      { src: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      'content-type': 'application/manifest+json',
      'cache-control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
