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
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/platform");
    }
  }, [loading, user, router]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const result = await login(email, password);
      if (result.memberships.length === 0) {
        router.push("/onboarding");
      } else if (result.memberships.length === 1) {
        router.push("/platform");
      } else {
        router.push("/select-workspace");
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to login.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-6">
      <form className="w-full space-y-4" onSubmit={onSubmit}>
        <h1 className="text-2xl font-semibold text-white">Login</h1>
        {error ? <Alert>{error}</Alert> : null}
        <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <Input label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        <Button type="submit" disabled={submitting || loading}>{submitting ? "Signing in..." : "Sign in"}</Button>
        <p className="text-sm text-slate-300">No account? <Link href="/signup" className="text-sky-300">Create one</Link></p>
      </form>
    </main>
  );
}
