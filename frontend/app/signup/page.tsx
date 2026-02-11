"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../components/ui";
import { useAuth } from "../../src/providers/AuthProvider";
import { signupSchema } from "../../src/lib/validators";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { signup, loading: authLoading, user } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/platform");
    }
  }, [authLoading, user, router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const validationResult = signupSchema.safeParse({ email, password });
    if (!validationResult.success) {
      const errors = validationResult.error.flatten().fieldErrors;
      setFieldErrors({
        email: errors.email?.[0],
        password: errors.password?.[0],
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await signup(email, password);
      router.push("/platform");
    } catch (submitError) {
      const errorMessage =
        submitError instanceof Error
          ? submitError.message
          : "Unable to complete signup.";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto w-full max-w-md space-y-6 rounded-3xl border border-white/10 bg-slate-900/60 p-8">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
            GymStack
          </p>
          <h1 className="text-3xl font-semibold">Create your account</h1>
          <p className="text-sm text-slate-300">
            Start your free GymStack journey in minutes.
          </p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {authLoading && (
            <p className="text-sm text-slate-300">Checking existing session...</p>
          )}
          <label className="flex flex-col gap-2 text-sm text-slate-200">
            Email
            <input
              className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white focus:border-indigo-400 focus:outline-none"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            {fieldErrors.email && (
              <p className="text-xs text-rose-300">{fieldErrors.email}</p>
            )}
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-200">
            Password
            <input
              className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white focus:border-indigo-400 focus:outline-none"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            {fieldErrors.password && (
              <p className="text-xs text-rose-300">{fieldErrors.password}</p>
            )}
          </label>
          <Button
            className="w-full"
            type="submit"
            disabled={isSubmitting || authLoading}
          >
            {isSubmitting || authLoading
              ? "Creating account..."
              : "Create account"}
          </Button>
        </form>
        {error && <p className="text-sm text-rose-300">{error}</p>}
      </div>
    </div>
  );
}
