import { apiFetch } from './apiFetch';
import { confirmChangeIntent, createChangeIntent } from './security';

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
  const intent = await createChangeIntent({
    type: 'SLUG_CHANGE',
    orgId: tenantId,
    payload: { slug: newSlug },
  });
  return {
    challengeId: intent.id,
    expiresAt: intent.expiresAt,
    pendingChangeType: 'TENANT_SLUG',
    normalizedSlug: newSlug,
  };
}

export async function verifyTenantSlugChange(
  tenantId: string,
  challengeId: string,
  otp: string,
): Promise<VerifyTenantSlugChangeResult> {
  await confirmChangeIntent(challengeId, otp);
  return {
    success: true,
    tenantId,
    oldSlug: '',
    newSlug: '',
    changedAt: new Date().toISOString(),
  };
}

export async function resendTenantSlugChangeOtp(
  tenantId: string,
  normalizedSlug: string,
): Promise<ResendTenantSlugChangeOtpResult> {
  const intent = await createChangeIntent({
    type: 'SLUG_CHANGE',
    orgId: tenantId,
    payload: { slug: normalizedSlug },
  });
  return {
    challengeId: intent.id,
    expiresAt: intent.expiresAt,
    resent: true,
  };
}
