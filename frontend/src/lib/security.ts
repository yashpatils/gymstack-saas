import { apiFetch } from './apiFetch';

export type ChangeIntentType =
  | 'EMAIL_CHANGE'
  | 'PASSWORD_CHANGE'
  | 'ORG_SETTINGS_CHANGE'
  | 'GYM_SETTINGS_CHANGE'
  | 'SLUG_CHANGE'
  | 'TWO_SV_TOGGLE'
  | 'BILLING_EMAIL_CHANGE';

export type ChangeIntentResult = {
  id: string;
  type: ChangeIntentType;
  expiresAt: string;
  status: 'PENDING' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED';
  maskedEmail: string;
};

export type TwoStepChallengeResult = {
  challengeId: string;
  expiresAt: string;
  resendAvailableAt?: string;
  action: 'ENABLE_2SV_EMAIL' | 'DISABLE_2SV_EMAIL';
  maskedEmail: string;
};

export type TwoStepToggleResult = {
  success: true;
  twoStepEmailEnabled: boolean;
  changedAt: string;
};

export function getApiError(err: unknown): { code?: string; message: string } {
  const source = err as {
    response?: { data?: { error?: { code?: string; message?: string } } };
    data?: { error?: { code?: string; message?: string } };
    error?: { code?: string; message?: string };
    details?: { error?: { code?: string; message?: string }; code?: string; message?: string };
    message?: string;
  };

  const code =
    source?.response?.data?.error?.code ??
    source?.data?.error?.code ??
    source?.error?.code ??
    source?.details?.error?.code ??
    source?.details?.code;

  const message =
    source?.response?.data?.error?.message ??
    source?.data?.error?.message ??
    source?.error?.message ??
    source?.details?.error?.message ??
    source?.details?.message ??
    source?.message ??
    'Something went wrong';

  return { code, message };
}

export function createChangeIntent(input: {
  type: ChangeIntentType;
  payload: Record<string, unknown>;
  orgId?: string;
  gymId?: string;
}): Promise<ChangeIntentResult> {
  return apiFetch<ChangeIntentResult>('/api/security/change-intents', {
    method: 'POST',
    body: input,
  });
}

export function confirmChangeIntent(intentId: string, otp: string): Promise<{ ok: true; id: string; type: ChangeIntentType }> {
  return apiFetch<{ ok: true; id: string; type: ChangeIntentType }>(`/api/security/change-intents/${intentId}/confirm`, {
    method: 'POST',
    body: { otp },
  });
}

export async function requestEnableTwoStepEmail(): Promise<TwoStepChallengeResult> {
  const response = await createChangeIntent({ type: 'TWO_SV_TOGGLE', payload: { enabled: true } });
  return { challengeId: response.id, expiresAt: response.expiresAt, action: 'ENABLE_2SV_EMAIL', maskedEmail: response.maskedEmail };
}

export async function verifyEnableTwoStepEmail(challengeId: string, otp: string): Promise<TwoStepToggleResult> {
  await confirmChangeIntent(challengeId, otp);
  return { success: true, twoStepEmailEnabled: true, changedAt: new Date().toISOString() };
}

export async function requestDisableTwoStepEmail(): Promise<TwoStepChallengeResult> {
  const response = await createChangeIntent({ type: 'TWO_SV_TOGGLE', payload: { enabled: false } });
  return { challengeId: response.id, expiresAt: response.expiresAt, action: 'DISABLE_2SV_EMAIL', maskedEmail: response.maskedEmail };
}

export async function verifyDisableTwoStepEmail(challengeId: string, otp: string): Promise<TwoStepToggleResult> {
  await confirmChangeIntent(challengeId, otp);
  return { success: true, twoStepEmailEnabled: false, changedAt: new Date().toISOString() };
}
