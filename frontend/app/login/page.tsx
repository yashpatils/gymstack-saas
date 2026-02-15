"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../src/providers/AuthProvider";
import { OAuthButtons } from "../../src/components/auth/OAuthButtons";
import { OAuthPersona, shouldShowOAuth } from "../../src/lib/auth/shouldShowOAuth";
import { ApiFetchError } from "../../src/lib/apiFetch";
import { Alert, Button, Input } from "../components/ui";
import { getValidatedNextUrl } from "./next-url";

const ADMIN_HOST = "admin.gymstack.club";
const MAIN_SITE_LOGIN = "https://gymstack.club/login";
const ADMIN_RESTRICTED_MESSAGE = "Access restricted. This portal is for Gym Stack administrators only.";

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

function LoginPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const { login, loading, user } = useAuth();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<OAuthPersona>('OWNER');
  const returnTo = typeof window === 'undefined' ? pathname : window.location.href;

  const isAdminHost = useMemo(
    () => (typeof window !== 'undefined' ? window.location.host.toLowerCase() === ADMIN_HOST : false),
    [],
  );

  const showOAuth = shouldShowOAuth({ pathname, selectedPersona }) && !isAdminHost;
  const sessionMessage = searchParams.get("message");
  const accessError = searchParams.get('error');
  const nextUrl = useMemo(() => getValidatedNextUrl(searchParams.get('next'), isAdminHost), [isAdminHost, searchParams]);

  useEffect(() => {
    if (!loading && user) {
      if (nextUrl) {
        redirectTo(nextUrl);
        return;
      }

      if (isAdminHost) {
        redirectTo(`https://${ADMIN_HOST}/`);
        return;
      }

      router.replace("/platform");
    }
  }, [isAdminHost, loading, nextUrl, router, user]);

  const adminBlocked = isAdminHost && accessError === 'restricted';

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <form
        className="w-full max-w-md space-y-4 rounded-3xl border border-white/15 bg-slate-900/75 p-6 shadow-2xl backdrop-blur"
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);
          setSubmitting(true);
          try {
            const result = await login(email, password, { adminOnly: isAdminHost });
            if (nextUrl) {
              redirectTo(nextUrl);
              return;
            }

            if (isAdminHost) {
              redirectTo(`https://${ADMIN_HOST}/`);
              return;
            }
            const hasOwnerRole = result.memberships.some((membership) => membership.role === 'TENANT_OWNER');
            if (result.memberships.length === 0) {
              router.push('/platform');
              return;
            }
            if (hasOwnerRole) {
              router.push('/platform/context');
              return;
            }
            router.push(result.memberships.length > 1 ? '/select-workspace' : '/platform');
          } catch (submitError) {
            if (isAdminHost && submitError instanceof ApiFetchError && submitError.statusCode === 403) {
              setError(ADMIN_RESTRICTED_MESSAGE);
            } else {
              setError(submitError instanceof Error ? submitError.message : "Unable to login.");
            }
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <h1 className="text-2xl font-semibold text-white">{isAdminHost ? 'Gym Stack Admin' : 'Welcome back'}</h1>
        <p className="text-sm text-slate-300">{isAdminHost ? 'Administrator access only.' : 'Sign in to your gym workspace.'}</p>
        {!isAdminHost ? (
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
        <Input label="Email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <Input label="Password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required rightElement={<button type="button" className="rounded-lg px-2 py-1 text-xs text-slate-200" onClick={() => setShowPassword((value) => !value)}>{showPassword ? "Hide" : "Show"}</button>} />
        <Button type="submit" disabled={submitting || loading}>{submitting ? "Signing in..." : "Sign in"}</Button>
        {showOAuth ? <OAuthButtons returnTo={returnTo} /> : null}
        <p className="text-sm text-slate-300">Forgot password? <Link href="/forgot-password" className="text-sky-300">Reset it</Link></p>
        {!isAdminHost ? <p className="text-sm text-slate-300">No account? <Link href="/signup" className="text-sky-300">Create one</Link></p> : null}
        {isAdminHost ? (
          <p className="text-sm text-slate-300">Need member login? <a href={MAIN_SITE_LOGIN} className="text-sky-300">Go to gymstack.club/login</a></p>
        ) : null}
      </form>
    </main>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<main className="min-h-screen" />}><LoginPageContent /></Suspense>;
}
