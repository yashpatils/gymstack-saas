import { apiFetch } from './apiFetch';

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

export async function requestEnableTwoStepEmail(): Promise<TwoStepChallengeResult> {
  return apiFetch<TwoStepChallengeResult>('/api/security/two-step/email/request-enable', {
    method: 'POST',
    body: {},
  });
}

export async function verifyEnableTwoStepEmail(challengeId: string, otp: string): Promise<TwoStepToggleResult> {
  return apiFetch<TwoStepToggleResult>('/api/security/two-step/email/verify-enable', {
    method: 'POST',
    body: { challengeId, otp },
  });
}

export async function requestDisableTwoStepEmail(): Promise<TwoStepChallengeResult> {
  return apiFetch<TwoStepChallengeResult>('/api/security/two-step/email/request-disable', {
    method: 'POST',
    body: {},
  });
}

export async function verifyDisableTwoStepEmail(challengeId: string, otp: string): Promise<TwoStepToggleResult> {
  return apiFetch<TwoStepToggleResult>('/api/security/two-step/email/verify-disable', {
    method: 'POST',
    body: { challengeId, otp },
  });
}
