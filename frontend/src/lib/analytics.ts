import { getStoredActiveContext } from './auth/contextStore';

type AnalyticsProps = {
  tenantId?: string;
  locationId?: string;
  role?: string;
  pageName?: string;
  [key: string]: string | number | boolean | undefined;
};

function isAnalyticsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === 'true';
}

async function sha256(value: string): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    return value;
  }

  const encoded = new TextEncoder().encode(value);
  const digest = await window.crypto.subtle.digest('SHA-256', encoded);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function track(eventName: string, properties: AnalyticsProps = {}): Promise<void> {
  if (!isAnalyticsEnabled()) {
    return;
  }

  const activeContext = getStoredActiveContext();
  const tenantIdRaw = properties.tenantId ?? activeContext?.tenantId;
  const locationIdRaw = properties.locationId ?? activeContext?.locationId;

  const payload = {
    eventName,
    properties: {
      ...properties,
      tenantId: tenantIdRaw ? await sha256(tenantIdRaw) : undefined,
      locationId: locationIdRaw ? await sha256(locationIdRaw) : undefined,
      pageName: properties.pageName ?? (typeof window !== 'undefined' ? window.location.pathname : undefined),
    },
    occurredAt: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    const ph = (window as { posthog?: { capture?: (name: string, props: Record<string, unknown>) => void } }).posthog;
    if (ph?.capture) {
      ph.capture(payload.eventName, payload.properties);
      return;
    }
  }

  console.debug('[analytics]', payload);
}
