"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { useAuth } from "../../src/providers/AuthProvider";
import { resendVerification } from "../../src/lib/auth";
import { Alert, Button, Input } from "../components/ui";

type Intent = "owner" | "staff" | "client";

function SignupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signup, acceptInvite } = useAuth();
  const [intent, setIntent] = useState<Intent>((searchParams.get("intent") as Intent) || "owner");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState(searchParams.get("token") ?? "");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [signupComplete, setSignupComplete] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

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
        <div className="flex flex-wrap gap-2">
          <button type="button" className="button secondary" onClick={() => setIntent("owner")}>Owner</button>
          <button type="button" className="button secondary" onClick={() => setIntent("staff")}>Staff</button>
          <button type="button" className="button secondary" onClick={() => setIntent("client")}>Client</button>
        </div>
        {error ? <Alert tone="error">{error}</Alert> : null}
        {inviteRequired ? <Input label="Invite token" value={token} onChange={(event) => setToken(event.target.value)} required /> : null}
        <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <Input label="Password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} required rightElement={<button type="button" className="rounded-lg px-2 py-1 text-xs text-slate-200" onClick={() => setShowPassword((value) => !value)}>{showPassword ? "Hide" : "Show"}</button>} />
        <Button type="submit" disabled={submitting}>{submitting ? "Submitting..." : title}</Button>
        <p className="text-sm text-slate-300">Already have an account? <Link href="/login" className="text-sky-300">Login</Link></p>
      </form>
    </main>
  );
}

export default function SignupPage() {
  return <Suspense fallback={<main className="min-h-screen" />}><SignupPageContent /></Suspense>;
}
