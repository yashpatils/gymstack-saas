'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';

type OtpChallengeModalProps = {
  open: boolean;
  title: string;
  description?: string;
  maskedEmail?: string;
  challengeId: string;
  expiresAt: string;
  resendAvailableAt?: string;
  verifyButtonLabel?: string;
  resendButtonLabel?: string;
  cancelButtonLabel?: string;
  onClose: () => void;
  onVerify: (otp: string) => Promise<void>;
  onResend: () => Promise<{
    expiresAt?: string;
    resendAvailableAt?: string;
    maskedEmail?: string;
  } | void>;
  verifying?: boolean;
  resending?: boolean;
  resetKey?: string;
};

type OtpModalState = {
  otp: string;
  errorMessage: string | null;
  infoMessage: string | null;
};

const initialState: OtpModalState = { otp: '', errorMessage: null, infoMessage: null };

export function OtpChallengeModal({
  open,
  title,
  description = 'Enter the 6-digit code sent to your email to continue.',
  maskedEmail,
  challengeId,
  expiresAt,
  resendAvailableAt,
  verifyButtonLabel = 'Verify code',
  resendButtonLabel = 'Resend code',
  cancelButtonLabel = 'Cancel',
  onClose,
  onVerify,
  onResend,
  verifying = false,
  resending = false,
  resetKey,
}: OtpChallengeModalProps) {
  const [state, setState] = useState<OtpModalState>(initialState);
  const [timing, setTiming] = useState({ expiresAt, resendAvailableAt, maskedEmail });
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setTiming({ expiresAt, resendAvailableAt, maskedEmail });
  }, [expiresAt, resendAvailableAt, maskedEmail, challengeId]);

  useEffect(() => {
    setState(initialState);
  }, [challengeId, open, resetKey]);

  useEffect(() => {
    if (!open) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !verifying) {
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, open, verifying]);

  const resendWaitSeconds = useMemo(() => {
    if (!timing.resendAvailableAt) return 0;
    const ms = new Date(timing.resendAvailableAt).getTime() - now;
    return ms > 0 ? Math.ceil(ms / 1000) : 0;
  }, [now, timing.resendAvailableAt]);

  if (!open) {
    return null;
  }

  const canVerify = state.otp.length === 6 && !verifying;

  const handleVerify = async () => {
    if (!canVerify) return;
    setState((prev) => ({ ...prev, errorMessage: null, infoMessage: null }));
    try {
      await onVerify(state.otp);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to verify code.';
      setState((prev) => ({ ...prev, errorMessage: message }));
    }
  };

  const handleResend = async () => {
    setState((prev) => ({ ...prev, errorMessage: null, infoMessage: null }));
    try {
      const update = await onResend();
      if (update) {
        setTiming((prev) => ({
          expiresAt: update.expiresAt ?? prev.expiresAt,
          resendAvailableAt: update.resendAvailableAt ?? prev.resendAvailableAt,
          maskedEmail: update.maskedEmail ?? prev.maskedEmail,
        }));
      }
      setState((prev) => ({ ...prev, infoMessage: 'A new code has been sent.' }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to resend code.';
      setState((prev) => ({ ...prev, errorMessage: message }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-600">{description}</p>
        {timing.maskedEmail ? <p className="mt-1 text-sm text-slate-600">We sent a code to {timing.maskedEmail}</p> : null}

        <div className="mt-4 space-y-2">
          <Label htmlFor="otp-code">Verification code</Label>
          <Input
            id="otp-code"
            autoFocus
            value={state.otp}
            onChange={(event) => {
              const digitsOnly = event.target.value.replace(/\D/g, '').slice(0, 6);
              setState((prev) => ({ ...prev, otp: digitsOnly }));
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && state.otp.length === 6) {
                event.preventDefault();
                void handleVerify();
              }
            }}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="123456"
          />
          <p className="text-xs text-slate-500">Challenge expires at {new Date(timing.expiresAt).toLocaleString()}.</p>
        </div>

        <div aria-live="polite" className="mt-3 min-h-5 text-sm">
          {state.errorMessage ? <p role="alert" className="text-red-600">{state.errorMessage}</p> : null}
          {!state.errorMessage && state.infoMessage ? <p className="text-slate-600">{state.infoMessage}</p> : null}
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="ghost" disabled={verifying} onClick={onClose}>{cancelButtonLabel}</Button>
          <Button variant="secondary" disabled={resendWaitSeconds > 0 || resending || verifying} onClick={() => void handleResend()}>
            {resending ? 'Sending…' : resendWaitSeconds > 0 ? `${resendButtonLabel} (${resendWaitSeconds}s)` : resendButtonLabel}
          </Button>
          <Button disabled={!canVerify} onClick={() => void handleVerify()}>{verifying ? 'Verifying…' : verifyButtonLabel}</Button>
        </div>
      </div>
    </div>
  );
}

export type { OtpChallengeModalProps, OtpModalState };
