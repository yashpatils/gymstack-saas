"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useAuth } from "../../src/providers/AuthProvider";
import { Alert, Button, Input } from "../components/ui";

type Intent = "owner" | "staff" | "client";

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signup, acceptInvite } = useAuth();
  const [intent, setIntent] = useState<Intent>((searchParams.get("intent") as Intent) || "owner");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState(searchParams.get("token") ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const inviteRequired = intent !== "owner";
  const title = useMemo(() => {
    if (intent === "owner") return "Create my gym";
    if (intent === "staff") return "Join as staff/coach";
    return "Join as client";
  }, [intent]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
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
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg items-center px-6">
      <form className="w-full space-y-4" onSubmit={onSubmit}>
        <h1 className="text-2xl font-semibold text-white">{title}</h1>
        <div className="flex gap-2 text-sm">
          <button type="button" className="button secondary" onClick={() => setIntent("owner")}>Owner</button>
          <button type="button" className="button secondary" onClick={() => setIntent("staff")}>Staff/Coach</button>
          <button type="button" className="button secondary" onClick={() => setIntent("client")}>Client</button>
        </div>
        {error ? <Alert>{error}</Alert> : null}
        {inviteRequired ? (
          <Input label="Invite token" value={token} onChange={(event) => setToken(event.target.value)} required />
        ) : null}
        <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required={!inviteRequired} />
        <Input label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required={!inviteRequired} />
        <Button type="submit" disabled={submitting}>{submitting ? "Submitting..." : title}</Button>
        <p className="text-sm text-slate-300">Already registered? <Link href="/login" className="text-sky-300">Login</Link></p>
      </form>
    </main>
  );
}
