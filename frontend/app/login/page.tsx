"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../src/providers/AuthProvider";
import { OAuthButtons } from "../../src/components/auth/OAuthButtons";
import { OAuthPersona, shouldShowOAuth } from "../../src/lib/auth/shouldShowOAuth";
import { Alert, Button, Input } from "../components/ui";

const ADMIN_HOST = "admin.gymstack.club";

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
  const showOAuth = shouldShowOAuth({ pathname, selectedPersona });
  const sessionMessage = searchParams.get("message");

  const isAdminHost = useMemo(
    () => (typeof window !== 'undefined' ? window.location.host.toLowerCase() === ADMIN_HOST : false),
    [],
  );

  const nextUrl = useMemo(() => {
    const rawNext = searchParams.get('next');
    return rawNext && rawNext.length > 0 ? rawNext : null;
  }, [searchParams]);

  useEffect(() => {
    if (!loading && user) {
      if (isAdminHost) {
        redirectTo(nextUrl ?? `https://${ADMIN_HOST}`);
        return;
      }
      router.replace("/platform");
    }
  }, [isAdminHost, loading, nextUrl, router, user]);

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <form
        className="w-full max-w-md space-y-4 rounded-3xl border border-white/15 bg-slate-900/75 p-6 shadow-2xl backdrop-blur"
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);
          setSubmitting(true);
          try {
            const result = await login(email, password);
            if (isAdminHost) {
              redirectTo(nextUrl ?? `https://${ADMIN_HOST}`);
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
            setError(submitError instanceof Error ? submitError.message : "Unable to login.");
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <h1 className="text-2xl font-semibold text-white">{isAdminHost ? 'Platform Admin Sign In' : 'Welcome back'}</h1>
        <p className="text-sm text-slate-300">{isAdminHost ? 'Sign in with your company owner account.' : 'Sign in to your gym workspace.'}</p>
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
        {sessionMessage ? <Alert tone="info">{sessionMessage}</Alert> : null}
        {error ? <Alert tone="error">{error}</Alert> : null}
        <Input label="Email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <Input label="Password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required rightElement={<button type="button" className="rounded-lg px-2 py-1 text-xs text-slate-200" onClick={() => setShowPassword((value) => !value)}>{showPassword ? "Hide" : "Show"}</button>} />
        <Button type="submit" disabled={submitting || loading}>{submitting ? "Signing in..." : "Sign in"}</Button>
        {showOAuth ? <OAuthButtons returnTo={returnTo} /> : null}
        <p className="text-sm text-slate-300">Forgot password? <Link href="/forgot-password" className="text-sky-300">Reset it</Link></p>
        <p className="text-sm text-slate-300">No account? <Link href="/signup" className="text-sky-300">Create one</Link></p>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<main className="min-h-screen" />}><LoginPageContent /></Suspense>;
}
