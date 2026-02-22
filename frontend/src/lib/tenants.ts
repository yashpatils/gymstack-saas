import { apiFetch } from './apiFetch';

export type SlugAvailabilityResult = {
  slug: string;
  available: boolean;
  reserved: boolean;
  validFormat: boolean;
  reason?: string;
};

export type RequestTenantSlugChangeResult = {
  challengeId: string;
  expiresAt: string;
  resendAvailableAt?: string;
  pendingChangeType: 'TENANT_SLUG';
  normalizedSlug: string;
};

export type VerifyTenantSlugChangeResult = {
  success: true;
  tenantId: string;
  oldSlug: string;
  newSlug: string;
  changedAt: string;
};

export type ResendTenantSlugChangeOtpResult = {
  challengeId: string;
  expiresAt: string;
  resendAvailableAt?: string;
  resent: true;
};

export async function checkTenantSlugAvailability(slug: string): Promise<SlugAvailabilityResult> {
  return apiFetch<SlugAvailabilityResult>(`/api/tenants/slug-availability?slug=${encodeURIComponent(slug)}`, {
    method: 'GET',
  });
}

export async function requestTenantSlugChange(
  tenantId: string,
  newSlug: string,
): Promise<RequestTenantSlugChangeResult> {
  return apiFetch<RequestTenantSlugChangeResult>(`/api/tenants/${tenantId}/slug/change/request`, {
    method: 'POST',
    body: { newSlug },
  });
}

export async function verifyTenantSlugChange(
  tenantId: string,
  challengeId: string,
  otp: string,
): Promise<VerifyTenantSlugChangeResult> {
  return apiFetch<VerifyTenantSlugChangeResult>(`/api/tenants/${tenantId}/slug/change/verify`, {
    method: 'POST',
    body: { challengeId, otp },
  });
}

export async function resendTenantSlugChangeOtp(
  tenantId: string,
  challengeId: string,
): Promise<ResendTenantSlugChangeOtpResult> {
  return apiFetch<ResendTenantSlugChangeOtpResult>(`/api/tenants/${tenantId}/slug/change/resend`, {
    method: 'POST',
    body: { challengeId },
  });
}
