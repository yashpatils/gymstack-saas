'use client';

import { useEffect, useState } from 'react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { OtpChallengeModal } from './OtpChallengeModal';
import {
  getApiError,
  requestDisableTwoStepEmail,
  requestEnableTwoStepEmail,
  verifyDisableTwoStepEmail,
  verifyEnableTwoStepEmail,
} from '@/src/lib/security';
import { useToast } from '../toast/ToastProvider';

type TwoStepEmailToggleProps = {
  enabled: boolean;
  featureEnabled: boolean;
  canManageSecurity?: boolean;
  emailMaskedHint?: string;
  onChanged?: (enabled: boolean) => void;
};

type TwoStepPendingAction = 'ENABLE_2SV_EMAIL' | 'DISABLE_2SV_EMAIL' | null;

type TwoStepChallengeState =
  | null
  | {
      challengeId: string;
      action: 'ENABLE_2SV_EMAIL' | 'DISABLE_2SV_EMAIL';
      expiresAt: string;
      resendAvailableAt?: string;
      maskedEmail: string;
    };

export function TwoStepEmailToggle({
  enabled,
  featureEnabled,
  canManageSecurity = true,
  emailMaskedHint,
  onChanged,
}: TwoStepEmailToggleProps) {
  const [localEnabled, setLocalEnabled] = useState(enabled);
  const [loadingRequest, setLoadingRequest] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [challenge, setChallenge] = useState<TwoStepChallengeState>(null);
  const [pendingAction, setPendingAction] = useState<TwoStepPendingAction>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const { success } = useToast();

  useEffect(() => {
    setLocalEnabled(enabled);
  }, [enabled]);

  if (!featureEnabled) {
    return null;
  }

  const toggle = async () => {
    if (loadingRequest || !canManageSecurity) return;
    setInlineError(null);
    setLoadingRequest(true);

    try {
      const response = localEnabled
        ? await requestDisableTwoStepEmail()
        : await requestEnableTwoStepEmail();
      setChallenge(response);
      setPendingAction(response.action);
      setModalOpen(true);
    } catch (err) {
      const parsed = getApiError(err);
      setInlineError(parsed.message);
    } finally {
      setLoadingRequest(false);
    }
  };

  const helperCopy = localEnabled
    ? 'Email verification is required every time you log in.'
    : 'Protect your account with an email code at login.';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Two-Step Verification</CardTitle>
        <CardDescription>When enabled, you’ll need a code sent to your email every time you log in.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Badge variant={localEnabled ? 'success' : 'secondary'}>{localEnabled ? 'Enabled' : 'Disabled'}</Badge>
            <p className="text-sm text-slate-600">{helperCopy}</p>
          </div>
          <Button onClick={() => void toggle()} disabled={loadingRequest || !canManageSecurity || modalOpen}>
            {loadingRequest ? 'Sending…' : localEnabled ? 'Disable' : 'Enable'}
          </Button>
        </div>
        <p className="text-sm text-slate-600">Codes are sent to your account email.</p>
        {inlineError ? <p role="alert" className="text-sm text-red-600">{inlineError}</p> : null}

        {challenge ? (
          <OtpChallengeModal
            open={modalOpen}
            title={pendingAction === 'DISABLE_2SV_EMAIL' ? 'Disable two-step verification' : 'Enable two-step verification'}
            challengeId={challenge.challengeId}
            expiresAt={challenge.expiresAt}
            resendAvailableAt={challenge.resendAvailableAt}
            maskedEmail={challenge.maskedEmail || emailMaskedHint}
            verifying={verifying}
            resending={resending}
            onClose={() => {
              setModalOpen(false);
              setChallenge(null);
              setPendingAction(null);
            }}
            onVerify={async (otp) => {
              if (!pendingAction) return;
              setVerifying(true);
              try {
                const response = pendingAction === 'ENABLE_2SV_EMAIL'
                  ? await verifyEnableTwoStepEmail(challenge.challengeId, otp)
                  : await verifyDisableTwoStepEmail(challenge.challengeId, otp);
                setLocalEnabled(response.twoStepEmailEnabled);
                setModalOpen(false);
                setChallenge(null);
                setPendingAction(null);
                onChanged?.(response.twoStepEmailEnabled);
                success(
                  response.twoStepEmailEnabled ? 'Two-step verification enabled.' : 'Two-step verification disabled.',
                );
              } catch (err) {
                const parsed = getApiError(err);
                throw new Error(parsed.message);
              } finally {
                setVerifying(false);
              }
            }}
            onResend={async () => {
              if (loadingRequest || !canManageSecurity) {
                return;
              }
              setResending(true);
              try {
                const response = localEnabled
                  ? await requestDisableTwoStepEmail()
                  : await requestEnableTwoStepEmail();
                setChallenge(response);
                setPendingAction(response.action);
                return {
                  expiresAt: response.expiresAt,
                  resendAvailableAt: response.resendAvailableAt,
                  maskedEmail: response.maskedEmail,
                };
              } catch (err) {
                const parsed = getApiError(err);
                throw new Error(parsed.message);
              } finally {
                setResending(false);
              }
            }}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

export type { TwoStepEmailToggleProps, TwoStepPendingAction, TwoStepChallengeState };
