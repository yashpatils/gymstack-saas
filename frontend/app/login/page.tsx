"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../src/providers/AuthProvider";
import { OAuthButtons } from "../../src/components/auth/OAuthButtons";
import { OAuthPersona, shouldShowOAuth } from "../../src/lib/auth/shouldShowOAuth";
import { ApiFetchError } from "../../src/lib/apiFetch";
import { me as fetchCurrentSession, resendLoginOtp, verifyLoginOtp } from "../../src/lib/auth";
import { getAdminHost, getBaseDomain, getMainSiteUrl } from "../../src/lib/domainConfig";
import { getAuthErrorMessage } from "../../src/lib/authErrorMessage";
import type { FrontendLoginResult } from "../../src/lib/auth.types";
import type { Membership } from "../../src/types/auth";
import { Alert, Button, Input } from "../components/ui";
import { getValidatedNextUrl } from "./next-url";

const ADMIN_HOST = getAdminHost();
const MAIN_SITE_LOGIN = getMainSiteUrl('/login');
const MAIN_SITE_PLATFORM = getMainSiteUrl('/platform');
const ADMIN_RESTRICTED_MESSAGE = "Access restricted. This portal is for Gym Stack administrators only.";
const ADMIN_NOT_AN_ACCOUNT_MESSAGE = 'Not an admin account. Sign in on the main platform instead.';

type LoginFlowState =
  | { step: 'CREDENTIALS' }
  | {
      step: 'OTP';
      challengeId: string;
      maskedEmail: string;
      channel: 'email';
      expiresAt: string;
      resendAvailableAt?: string;
    };

const personaOptions: Array<{ label: string; value: OAuthPersona }> = [
  { label: 'Owner', value: 'OWNER' },
  { label: 'Manager', value: 'MANAGER' },
  { label: 'Coach', value: 'COACH' },
  { label: 'Client', value: 'CLIENT' },
];

function redirectTo(url: string) {
  if (typeof window !== 'undefined') {
    window.location.assign(url);
  }
}

function getOtpErrorMessage(error: unknown): string {
  if (!(error instanceof ApiFetchError)) {
    return 'Unable to verify code.';
  }

  const code = typeof error.details === 'object' && error.details && 'code' in error.details
    ? String((error.details as { code?: unknown }).code ?? '')
    : '';

  switch (code) {
    case 'OTP_INVALID':
      return error.message || 'Invalid code. Try again.';
    case 'OTP_EXPIRED':
      return error.message || 'Code expired. Request a new code.';
    case 'OTP_ATTEMPTS_EXCEEDED':
      return error.message || 'Too many attempts. Request a new code.';
    case 'RATE_LIMITED':
      return error.message || 'Too many requests. Try again shortly.';
    default:
      return error.message || 'Unable to verify code.';
  }
}

function LoginPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const { login, loading, isHydrating, authStatus, platformRole, user } = useAuth();
  const searchParams = useSearchParams();
  const [flow, setFlow] = useState<LoginFlowState>({ step: 'CREDENTIALS' });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpInfo, setOtpInfo] = useState<string | null>(null);
  const [supportRequestId, setSupportRequestId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resendingOtp, setResendingOtp] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<OAuthPersona>('OWNER');
  const returnTo = typeof window === 'undefined' ? pathname : window.location.href;

  const isAdminHost = useMemo(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    const host = window.location.hostname.toLowerCase();
    const baseDomain = getBaseDomain();
    return host === ADMIN_HOST || host === `admin.${baseDomain}`;
  }, []);

  const showOAuth = shouldShowOAuth({ pathname, selectedPersona }) && !isAdminHost;
  const sessionMessage = searchParams.get("message");
  const accessError = searchParams.get('error');
  const nextUrl = useMemo(() => getValidatedNextUrl(searchParams.get('next'), isAdminHost), [isAdminHost, searchParams]);

  useEffect(() => {
    if (isHydrating || authStatus === 'loading') {
      return;
    }

    if (authStatus !== 'authenticated' || !user) {
      return;
    }

    if (nextUrl) {
      redirectTo(nextUrl);
      return;
    }

    if (isAdminHost) {
      if (platformRole === 'PLATFORM_ADMIN') {
        redirectTo('/admin');
        return;
      }

      setError(ADMIN_NOT_AN_ACCOUNT_MESSAGE);
      return;
    }

    router.replace('/platform');
  }, [authStatus, isAdminHost, isHydrating, nextUrl, platformRole, router, user]);

  const adminBlocked = isAdminHost && accessError === 'restricted';

  const handlePostLoginRedirect = async (result: Extract<FrontendLoginResult, { status: 'SUCCESS' }>) => {
    if (nextUrl) {
      redirectTo(nextUrl);
      return;
    }

    if (isAdminHost) {
      const session = await fetchCurrentSession();
      if (session.isPlatformAdmin || session.platformRole === 'PLATFORM_ADMIN') {
        redirectTo('/admin');
        return;
      }

      setError(ADMIN_NOT_AN_ACCOUNT_MESSAGE);
      return;
    }

    const membershipsArray: Membership[] = Array.isArray(result.memberships)
      ? result.memberships
      : [
        ...result.memberships.tenant.map((membership, index) => ({
          id: `tenant-${membership.tenantId}-${index}`,
          tenantId: membership.tenantId,
          gymId: null,
          locationId: null,
          role: membership.role,
          status: 'ACTIVE',
        })),
        ...result.memberships.location.map((membership, index) => ({
          id: `location-${membership.locationId}-${index}`,
          tenantId: membership.tenantId,
          gymId: membership.locationId,
          locationId: membership.locationId,
          role: membership.role,
          status: 'ACTIVE',
        })),
      ];
    const hasOwnerRole = membershipsArray.some((membership) => membership.role === 'TENANT_OWNER');
    if (membershipsArray.length === 0) {
      router.push('/platform');
      return;
    }
    if (hasOwnerRole) {
      router.push('/platform/context');
      return;
    }
    router.push(membershipsArray.length > 1 ? '/select-workspace' : '/platform');
  };

  const canResendNow = useMemo(() => {
    if (flow.step !== 'OTP') {
      return false;
    }
    if (!flow.resendAvailableAt) {
      return true;
    }
    return Date.now() >= new Date(flow.resendAvailableAt).getTime();
  }, [flow]);

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <form
        className="w-full max-w-md space-y-4 rounded-3xl border border-border bg-card p-6 shadow-2xl backdrop-blur"
        onSubmit={async (event) => {
          event.preventDefault();
          if (flow.step === 'OTP') {
            return;
          }
          setError(null);
          setOtpError(null);
          setOtpInfo(null);
          setSupportRequestId(null);
          setSubmitting(true);
          try {
            const result = await login(email, password, { adminOnly: isAdminHost });

            if (result.status === 'OTP_REQUIRED') {
              setFlow({
                step: 'OTP',
                challengeId: result.challengeId,
                maskedEmail: result.maskedEmail,
                channel: result.channel,
                expiresAt: result.expiresAt,
                resendAvailableAt: result.resendAvailableAt,
              });
              setOtp('');
              try {
                const sent = await resendLoginOtp(result.challengeId);
                setFlow((prev) => prev.step === 'OTP'
                  ? { ...prev, challengeId: sent.challengeId, maskedEmail: sent.maskedEmail, expiresAt: sent.expiresAt, resendAvailableAt: sent.resendAvailableAt }
                  : prev);
                setOtpInfo('A verification code was sent to your email.');
              } catch {
                setOtpError('We could not send the verification code. Please try resend.');
              }
              return;
            }

            await handlePostLoginRedirect(result);
          } catch (submitError) {
            if (submitError instanceof ApiFetchError && submitError.requestId) {
              setSupportRequestId(submitError.requestId);
            }
            if (submitError instanceof ApiFetchError && submitError.statusCode === 409 && submitError.details && typeof submitError.details === 'object' && 'code' in submitError.details) {
              const code = String((submitError.details as { code?: unknown }).code ?? '');
              if (code === 'TENANT_SELECTION_REQUIRED') {
                router.push('/select-workspace');
                return;
              }
              if (code === 'NO_WORKSPACE') {
                router.push('/onboarding');
                return;
              }
            }
            if (isAdminHost && submitError instanceof ApiFetchError && submitError.statusCode === 403) {
              setError(ADMIN_RESTRICTED_MESSAGE);
            } else {
              setError(getAuthErrorMessage(submitError));
            }
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <h1 className="text-2xl font-semibold text-foreground">{isAdminHost ? 'Gym Stack Admin' : 'Welcome back'}</h1>
        <p className="text-sm text-muted-foreground">{isAdminHost ? 'Administrator access only.' : 'Sign in to your gym workspace.'}</p>
        {!isAdminHost && flow.step === 'CREDENTIALS' ? (
          <div className="grid grid-cols-2 gap-2">
            {personaOptions.map((option) => {
              const isActive = selectedPersona === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={isActive}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${isActive ? 'border-sky-300 bg-sky-500/20 text-sky-100 ring-2 ring-sky-300/60' : 'border-white/20 text-slate-200 hover:border-slate-300 hover:bg-white/5'}`}
                  onClick={() => setSelectedPersona(option.value)}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        ) : null}
        {sessionMessage ? <Alert tone="info">{sessionMessage}</Alert> : null}
        {adminBlocked ? <Alert tone="error">{ADMIN_RESTRICTED_MESSAGE}</Alert> : null}
        {error ? <Alert tone="error">{error}</Alert> : null}

        {isAdminHost && supportRequestId ? (
          <details className="rounded-xl border border-white/10 bg-slate-950/40 p-3 text-xs text-slate-300">
            <summary className="cursor-pointer text-slate-200">Support info</summary>
            <p className="mt-2">Request ID: <span className="font-mono">{supportRequestId}</span></p>
          </details>
        ) : null}

        {flow.step === 'CREDENTIALS' ? (
          <>
            <Input label="Email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            <Input label="Password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required rightElement={<button type="button" className="rounded-lg px-2 py-1 text-xs text-slate-200" onClick={() => setShowPassword((value) => !value)}>{showPassword ? "Hide" : "Show"}</button>} />
            <Button type="submit" disabled={submitting || loading}>{submitting ? "Signing in..." : "Sign in"}</Button>
            {showOAuth ? <OAuthButtons returnTo={returnTo} /> : null}
            <p className="text-sm text-slate-300">Forgot password? <Link href="/forgot-password" className="text-sky-300">Reset it</Link></p>
            {!isAdminHost ? <p className="text-sm text-slate-300">No account? <Link href="/signup" className="text-sky-300">Create one</Link></p> : null}
          </>
        ) : (
          <>
            <Alert tone="info">We sent a 6-digit code to <strong>{flow.maskedEmail}</strong>.</Alert>
            {otpInfo ? <Alert tone="success">{otpInfo}</Alert> : null}
            {otpError ? <Alert tone="error">{otpError}</Alert> : null}
            <Input
              label="Verification code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\\d{6}"
              maxLength={6}
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
            />
            <Button
              type="button"
              onClick={async () => {
                if (flow.step !== 'OTP') {
                  return;
                }
                setOtpError(null);
                setOtpInfo(null);
                setVerifyingOtp(true);
                try {
                  const result = await verifyLoginOtp(flow.challengeId, otp);
                  await handlePostLoginRedirect(result);
                } catch (otpSubmitError) {
                  setOtpError(getOtpErrorMessage(otpSubmitError));
                } finally {
                  setVerifyingOtp(false);
                }
              }}
              disabled={verifyingOtp || otp.length !== 6}
            >
              {verifyingOtp ? 'Verifying...' : 'Verify code'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={async () => {
                if (flow.step !== 'OTP') {
                  return;
                }
                setOtpError(null);
                setOtpInfo(null);
                setResendingOtp(true);
                try {
                  const response = await resendLoginOtp(flow.challengeId);
                  setFlow((prev) => prev.step === 'OTP'
                    ? { ...prev, challengeId: response.challengeId, maskedEmail: response.maskedEmail, expiresAt: response.expiresAt, resendAvailableAt: response.resendAvailableAt }
                    : prev,
                  );
                  setOtpInfo('A new code was sent to your email.');
                } catch (otpResendError) {
                  setOtpError(getOtpErrorMessage(otpResendError));
                } finally {
                  setResendingOtp(false);
                }
              }}
              disabled={resendingOtp || !canResendNow}
            >
              {resendingOtp ? 'Sending...' : 'Resend code'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setFlow({ step: 'CREDENTIALS' });
                setOtp('');
                setOtpError(null);
                setOtpInfo(null);
              }}
            >
              Back
            </Button>
          </>
        )}
        {isAdminHost ? (
          <p className="text-sm text-slate-300">Need member login? <a href={MAIN_SITE_LOGIN} className="text-sky-300">Go to gymstack.club/login</a></p>
        ) : null}
        {isAdminHost && error === ADMIN_NOT_AN_ACCOUNT_MESSAGE ? (
          <a href={MAIN_SITE_PLATFORM} className="block text-sm text-sky-300">Continue to platform</a>
        ) : null}
      </form>
    </main>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<main className="min-h-screen" />}><LoginPageContent /></Suspense>;
}
