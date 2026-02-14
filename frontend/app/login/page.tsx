"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../../src/providers/AuthProvider";
import { Alert, Button, Input } from "../components/ui";

export default function LoginPage() {
  const router = useRouter();
  const { login, loading, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/platform");
  }, [loading, router, user]);

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
            const hasOwnerRole = result.memberships.some((membership) => membership.role === 'TENANT_OWNER');
            router.push(hasOwnerRole ? '/platform/context' : result.memberships.length > 1 ? '/select-workspace' : '/platform');
          } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : "Unable to login.");
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <h1 className="text-2xl font-semibold text-white">Welcome back</h1>
        <p className="text-sm text-slate-300">Tenant owners/managers sign in here. Staff/coaches/clients should sign in from their gym landing page.</p>
        {error ? <Alert tone="error">{error}</Alert> : null}
        <Input label="Email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <Input label="Password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required rightElement={<button type="button" className="rounded-lg px-2 py-1 text-xs text-slate-200" onClick={() => setShowPassword((value) => !value)}>{showPassword ? "Hide" : "Show"}</button>} />
        <Button type="submit" disabled={submitting || loading}>{submitting ? "Signing in..." : "Sign in"}</Button>
        <p className="text-sm text-slate-300">Forgot password? <Link href="/forgot-password" className="text-sky-300">Reset it</Link></p>
        <p className="text-sm text-slate-300">No account? <Link href="/signup" className="text-sky-300">Create one</Link></p>
      </form>
    </main>
  );
}
