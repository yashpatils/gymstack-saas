"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { OAuthButtons } from "../../src/components/auth/OAuthButtons";
import { OAuthPersona, shouldShowOAuth } from "../../src/lib/auth/shouldShowOAuth";
import { useAuth } from "../../src/providers/AuthProvider";
import { resendVerification } from "../../src/lib/auth";
import { Alert, Button, Input } from "../components/ui";

type Intent = "owner" | "staff" | "client";

type RoleOption = {
  value: Intent;
  label: string;
  description: string;
  persona: OAuthPersona;
};

const roleOptions: RoleOption[] = [
  { value: 'owner', label: 'Owner', description: 'Create and manage a gym workspace.', persona: 'OWNER' },
  { value: 'staff', label: 'Staff', description: 'Join as manager or coach via invite.', persona: 'STAFF' },
  { value: 'client', label: 'Client', description: 'Join member experiences with an invite.', persona: 'CLIENT' },
];

const getIntentFromQuery = (value: string | null): Intent => {
  if (value === 'staff' || value === 'client') {
    return value;
  }

  return 'owner';
};

const getPersonaForIntent = (intent: Intent): OAuthPersona => {
  return roleOptions.find((option) => option.value === intent)?.persona ?? 'OWNER';
};

function CheckIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function SignupPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { signup, acceptInvite } = useAuth();
  const [selectedRole, setSelectedRole] = useState<Intent | null>(getIntentFromQuery(searchParams.get('intent')));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState(searchParams.get("token") ?? "");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [signupComplete, setSignupComplete] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const intent = selectedRole ?? 'owner';
  const selectedPersona = selectedRole ? getPersonaForIntent(selectedRole) : null;
  const returnTo = typeof window === 'undefined' ? pathname : window.location.href;
  const showOAuth = shouldShowOAuth({ pathname, selectedPersona });

  const inviteRequired = intent !== "owner";
  const title = useMemo(() => (intent === "owner" ? "Create owner account" : intent === "staff" ? "Join as staff" : "Join as client"), [intent]);

  if (signupComplete) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <section className="w-full max-w-lg space-y-4 rounded-3xl border border-white/15 bg-slate-900/75 p-6 shadow-2xl">
          <h1 className="text-2xl font-semibold text-white">Check your inbox</h1>
          <p className="text-slate-300">We sent a verification link to <span className="font-medium text-white">{email}</span>.</p>
          {notice ? <Alert tone="success">{notice}</Alert> : null}
          {error ? <Alert tone="error">{error}</Alert> : null}
          <div className="flex gap-3">
            <Button type="button" onClick={async () => {
              setError(null);
              try {
                const result = await resendVerification(email);
                setNotice(result.message);
              } catch (resendError) {
                setError(resendError instanceof Error ? resendError.message : "Unable to resend verification.");
              }
            }}>
              Resend verification
            </Button>
            <Button type="button" variant="secondary" onClick={() => router.push('/login')}>Go to login</Button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <form className="w-full max-w-lg space-y-4 rounded-3xl border border-white/15 bg-slate-900/75 p-6 shadow-2xl" onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
          if (inviteRequired) {
            const result = await acceptInvite({ token, email: email || undefined, password: password || undefined });
            router.push(result.memberships.length > 1 ? "/select-workspace" : "/platform");
          } else {
            await signup(email, password);
            setSignupComplete(true);
          }
        } catch (submitError) {
          setError(submitError instanceof Error ? submitError.message : "Unable to sign up.");
        } finally {
          setSubmitting(false);
        }
      }}>
        <h1 className="text-2xl font-semibold text-white">{title}</h1>
        <div className="grid gap-3 sm:grid-cols-3">
          {roleOptions.map((role) => {
            const isActive = selectedRole === role.value;

            return (
              <button
                key={role.value}
                type="button"
                aria-pressed={isActive}
                onClick={() => setSelectedRole(role.value)}
                className={`rounded-2xl border p-4 text-left transition ${isActive ? 'border-sky-300 bg-sky-500/20 text-sky-100 ring-2 ring-sky-300/60 shadow-[0_0_18px_rgba(56,189,248,0.35)]' : 'border-white/20 text-slate-200 hover:border-slate-300 hover:bg-white/5'}`}
              >
                <span className="mb-1 flex items-center justify-between text-sm font-semibold">
                  {role.label}
                  {isActive ? <CheckIcon /> : null}
                </span>
                <span className="text-xs text-slate-300">{role.description}</span>
              </button>
            );
          })}
        </div>
        {error ? <Alert tone="error">{error}</Alert> : null}
        {inviteRequired ? <Input label="Invite token" value={token} onChange={(event) => setToken(event.target.value)} required /> : null}
        <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <Input label="Password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} required rightElement={<button type="button" className="rounded-lg px-2 py-1 text-xs text-slate-200" onClick={() => setShowPassword((value) => !value)}>{showPassword ? "Hide" : "Show"}</button>} />
        <Button type="submit" disabled={submitting}>{submitting ? "Submitting..." : title}</Button>
        {showOAuth ? <OAuthButtons returnTo={returnTo} /> : null}
        <p className="text-sm text-slate-300">Already have an account? <Link href="/login" className="text-sky-300">Login</Link></p>
      </form>
    </main>
  );
}

export default function SignupPage() {
  return <Suspense fallback={<main className="min-h-screen" />}><SignupPageContent /></Suspense>;
}
