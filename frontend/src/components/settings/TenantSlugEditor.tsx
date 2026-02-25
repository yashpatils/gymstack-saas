'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { OtpChallengeModal } from './OtpChallengeModal';
import {
  checkTenantSlugAvailability,
  requestTenantSlugChange,
  resendTenantSlugChangeOtp,
  verifyTenantSlugChange,
} from '@/src/lib/tenants';
import { getApiError } from '@/src/lib/security';
import { useToast } from '../toast/ToastProvider';

type TenantSlugEditorProps = {
  tenantId: string;
  currentSlug: string;
  canEdit: boolean;
  featureEnabled: boolean;
  onSlugChanged?: (newSlug: string) => void;
};

type SlugCheckStatus =
  | { state: 'IDLE' }
  | { state: 'CHECKING' }
  | { state: 'VALID'; normalizedSlug: string }
  | { state: 'INVALID'; reason: string }
  | { state: 'RESERVED'; reason: string }
  | { state: 'TAKEN'; reason: string }
  | { state: 'ERROR'; message: string };

type SlugChangeChallenge =
  | null
  | {
      challengeId: string;
      normalizedSlug: string;
      expiresAt: string;
      resendAvailableAt?: string;
    };

const SLUG_HELPER = 'This slug is used in your public page URL. Changing it may affect shared links.';

export function TenantSlugEditor({ tenantId, currentSlug, canEdit, featureEnabled, onSlugChanged }: TenantSlugEditorProps) {
  const [inputValue, setInputValue] = useState(currentSlug);
  const [latestCommittedSlug, setLatestCommittedSlug] = useState(currentSlug);
  const [checkStatus, setCheckStatus] = useState<SlugCheckStatus>({ state: 'IDLE' });
  const [isRequestingChange, setIsRequestingChange] = useState(false);
  const [challenge, setChallenge] = useState<SlugChangeChallenge>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const seqRef = useRef(0);
  const { success, error } = useToast();

  useEffect(() => {
    setInputValue(currentSlug);
    setLatestCommittedSlug(currentSlug);
  }, [currentSlug]);

  useEffect(() => {
    if (!featureEnabled || !canEdit || modalOpen) {
      return;
    }

    const candidate = inputValue.trim();
    if (!candidate) {
      setCheckStatus({ state: 'IDLE' });
      return;
    }

    const timeout = window.setTimeout(async () => {
      const seq = ++seqRef.current;
      setCheckStatus({ state: 'CHECKING' });
      try {
        const result = await checkTenantSlugAvailability(candidate);
        if (seq !== seqRef.current) return;
        if (!result.validFormat) {
          setCheckStatus({ state: 'INVALID', reason: result.reason ?? 'Use lowercase letters, numbers, and hyphens only.' });
          return;
        }
        if (result.reserved) {
          setCheckStatus({ state: 'RESERVED', reason: result.reason ?? 'This slug is reserved and cannot be used.' });
          return;
        }
        if (!result.available) {
          setCheckStatus({ state: 'TAKEN', reason: result.reason ?? 'This slug is already in use.' });
          return;
        }
        setCheckStatus({ state: 'VALID', normalizedSlug: result.slug });
      } catch {
        if (seq !== seqRef.current) return;
        setCheckStatus({ state: 'ERROR', message: 'Couldn’t check availability right now. Try again.' });
      }
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [canEdit, featureEnabled, inputValue, modalOpen]);

  const normalizedCandidate = checkStatus.state === 'VALID' ? checkStatus.normalizedSlug : inputValue.trim().toLowerCase();
  const isDirty = normalizedCandidate !== latestCommittedSlug;
  const requestDisabled =
    !canEdit ||
    !featureEnabled ||
    !isDirty ||
    checkStatus.state !== 'VALID' ||
    isRequestingChange ||
    modalOpen;

  const statusMessage = useMemo(() => {
    switch (checkStatus.state) {
      case 'IDLE':
        return 'Enter a new slug to check availability.';
      case 'CHECKING':
        return 'Checking availability…';
      case 'VALID':
        return `Available: ${checkStatus.normalizedSlug}`;
      case 'INVALID':
      case 'RESERVED':
      case 'TAKEN':
        return checkStatus.reason;
      case 'ERROR':
        return checkStatus.message;
      default:
        return '';
    }
  }, [checkStatus]);

  if (!featureEnabled) {
    return null;
  }

  const requestChange = async () => {
    if (checkStatus.state !== 'VALID') return;
    setIsRequestingChange(true);
    try {
      const response = await requestTenantSlugChange(tenantId, checkStatus.normalizedSlug);
      setChallenge({
        challengeId: response.challengeId,
        normalizedSlug: response.normalizedSlug,
        expiresAt: response.expiresAt,
        resendAvailableAt: response.resendAvailableAt,
      });
      setModalOpen(true);
    } catch (err) {
      const parsed = getApiError(err);
      error('Slug update failed', parsed.message);
    } finally {
      setIsRequestingChange(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Public URL slug</CardTitle>
        <CardDescription>{SLUG_HELPER}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-600">gymstack.club/{latestCommittedSlug}</p>
        <div className="space-y-2">
          <Label htmlFor="tenant-slug-input">Slug</Label>
          <div className="flex gap-2">
            <Input
              id="tenant-slug-input"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              disabled={!canEdit || modalOpen}
              aria-describedby="tenant-slug-status"
            />
            <Button onClick={() => void requestChange()} disabled={requestDisabled}>
              {isRequestingChange ? 'Saving…' : 'Request change'}
            </Button>
          </div>
        </div>
        <div id="tenant-slug-status" aria-live="polite" className="flex items-center gap-2 text-sm text-slate-600">
          {checkStatus.state === 'VALID' ? <Badge variant="success">Available</Badge> : null}
          {(checkStatus.state === 'INVALID' || checkStatus.state === 'RESERVED' || checkStatus.state === 'TAKEN') ? <Badge variant="warning">Unavailable</Badge> : null}
          {checkStatus.state === 'ERROR' ? <Badge variant="destructive">Error</Badge> : null}
          <span>{statusMessage}</span>
        </div>

        {challenge ? (
          <OtpChallengeModal
            open={modalOpen}
            title="Confirm slug change"
            challengeId={challenge.challengeId}
            expiresAt={challenge.expiresAt}
            resendAvailableAt={challenge.resendAvailableAt}
            onClose={() => {
              setModalOpen(false);
              setChallenge(null);
            }}
            verifying={verifying}
            resending={resending}
            onVerify={async (otp) => {
              setVerifying(true);
              try {
                const response = await verifyTenantSlugChange(tenantId, challenge.challengeId, otp);
                setLatestCommittedSlug(response.newSlug);
                setInputValue(response.newSlug);
                setCheckStatus({ state: 'IDLE' });
                setModalOpen(false);
                setChallenge(null);
                success('Slug updated', `New slug: ${response.newSlug}`);
                onSlugChanged?.(response.newSlug);
              } catch (err) {
                const parsed = getApiError(err);
                throw new Error(parsed.message);
              } finally {
                setVerifying(false);
              }
            }}
            onResend={async () => {
              setResending(true);
              try {
                const response = await resendTenantSlugChangeOtp(tenantId, challenge.normalizedSlug);
                setChallenge((current) => (
                  current
                    ? {
                        ...current,
                        challengeId: response.challengeId,
                        expiresAt: response.expiresAt,
                        resendAvailableAt: response.resendAvailableAt,
                      }
                    : current
                ));
                return {
                  expiresAt: response.expiresAt,
                  resendAvailableAt: response.resendAvailableAt,
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

export type { TenantSlugEditorProps, SlugCheckStatus };
