"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { useAuth } from "../../src/providers/AuthProvider";
import { Alert, Button, Input } from "../components/ui";

function SignupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("inviteToken") ?? searchParams.get("token") ?? "";
  const { signup, acceptInvite } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState(inviteToken);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const inviteFlow = useMemo(() => token.trim().length > 0, [token]);

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <form className="w-full max-w-lg space-y-4 rounded-3xl border border-white/15 bg-slate-900/75 p-6 shadow-2xl" onSubmit={async (event) => {
        event.preventDefault();
        setSubmitting(true);
        setError(null);
        try {
          if (inviteFlow) {
            const result = await acceptInvite({ token, email, password });
            router.push(result.memberships.length > 1 ? "/select-workspace" : "/platform");
            return;
          }

          await signup(email, password);
          router.push("/platform/onboarding");
        } catch (submitError) {
          setError(submitError instanceof Error ? submitError.message : "Unable to sign up.");
        } finally {
          setSubmitting(false);
        }
      }}>
        <h1 className="text-2xl font-semibold text-white">{inviteFlow ? "Join from invite" : "Create owner account"}</h1>
        <p className="text-sm text-slate-300">{inviteFlow ? "Role is assigned by your invite. Invalid/expired invites cannot be used." : "Owner signup creates your tenant. Staff/client accounts must use an invite token."}</p>
        {error ? <Alert tone="error">{error}</Alert> : null}
        <Input label="Invite token (optional for owner)" value={token} onChange={(event) => setToken(event.target.value)} />
        <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <Input label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        <Button type="submit" disabled={submitting}>{submitting ? "Submitting..." : inviteFlow ? "Join workspace" : "Create owner account"}</Button>
        <p className="text-sm text-slate-300">Already have an account? <Link href="/login" className="text-sky-300">Login</Link></p>
      </form>
    </main>
  );
}

export default function SignupPage() {
  return <Suspense fallback={<main className="min-h-screen" />}><SignupPageContent /></Suspense>;
}
