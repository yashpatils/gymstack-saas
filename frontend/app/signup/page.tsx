"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { useAuth } from "../../src/providers/AuthProvider";
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

  const inviteRequired = intent !== "owner";
  const title = useMemo(() => (intent === "owner" ? "Create owner account" : intent === "staff" ? "Join as staff" : "Join as client"), [intent]);

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
            const result = await signup(email, password);
            router.push(result.memberships.length === 0 ? "/onboarding" : "/platform");
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
