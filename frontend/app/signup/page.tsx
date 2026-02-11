"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../src/providers/AuthProvider";
import { useToast } from "../../src/components/toast/ToastProvider";
import {
  Alert,
  Button,
  Divider,
  IconButton,
  Input,
} from "../components/ui/index";
import { Skeleton } from "../../src/components/ui/Skeleton";

type FieldErrors = {
  email?: string;
  password?: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateCredentials(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};

  if (!email.trim()) {
    errors.email = "Email is required.";
  } else if (!emailPattern.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!password) {
    errors.password = "Password is required.";
  } else if (password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  }

  return errors;
}

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { signup, loading: authLoading, user } = useAuth();
  const toast = useToast();

  const isBusy = authLoading || isSubmitting;
  const passwordHelper = useMemo(
    () =>
      showPassword
        ? "Use a strong password before sharing your screen."
        : "Use at least 8 characters with a mix of letters and numbers.",
    [showPassword],
  );

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/onboarding");
    }
  }, [authLoading, user, router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const errors = validateCredentials(email, password);
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      await signup(email, password);
      router.push("/onboarding");
    } catch (submitError) {
      const errorMessage =
        submitError instanceof Error
          ? submitError.message
          : "Unable to complete signup.";
      setError(errorMessage);
      toast.error("Signup failed", errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.3),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(129,140,248,0.26),transparent_43%)]" />

      <section className="relative mx-auto w-full max-w-5xl rounded-3xl border border-white/20 bg-white/10 p-1 shadow-2xl shadow-sky-900/30 backdrop-blur-xl">
        <div className="grid overflow-hidden rounded-[22px] bg-slate-900/70 lg:grid-cols-[1.08fr_1fr]">
          <div className="flex flex-col justify-between gap-8 border-b border-white/10 p-8 lg:border-b-0 lg:border-r">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.35em] text-sky-200/90">GymStack</p>
              <h1 className="text-3xl font-semibold leading-tight">Build your gym operation command center.</h1>
              <p className="max-w-md text-sm text-slate-300">
                Create your account and get immediate access to scheduling, memberships, and growth analytics.
              </p>
            </div>
            <ul className="space-y-3 text-sm text-slate-200">
              <li>• Launch tenant-ready workflows for every location.</li>
              <li>• Keep teams aligned with role-based permissions.</li>
              <li>• Scale confidently with secure centralized access.</li>
            </ul>
          </div>

          <div className="p-6 sm:p-8">
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-semibold">Create account</h2>
                <p className="mt-1 text-sm text-slate-300">Start with your work email. You can invite your team later.</p>
              </div>

              {error ? <Alert>{error}</Alert> : null}
              {authLoading ? <Alert tone="info">Checking existing session...</Alert> : null}

              <Button variant="secondary" disabled className="gap-3">
                <span className="text-base">G</span>
                Continue with Google
              </Button>

              <Divider label="or sign up with email" />

              <form className="space-y-4" onSubmit={handleSubmit} noValidate>
                <Input
                  label="Email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@company.com"
                  helperText="We'll use this to create your GymStack workspace login."
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  error={fieldErrors.email}
                />

                <Input
                  label="Password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Create a secure password"
                  helperText={passwordHelper}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  error={fieldErrors.password}
                  rightElement={
                    <IconButton
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowPassword((current) => !current)}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </IconButton>
                  }
                />

                <div className="flex items-center justify-between">
                  <Link href="/forgot-password" className="text-sm text-sky-200 hover:text-sky-100">
                    Forgot password?
                  </Link>
                </div>

                <Button type="submit" disabled={isBusy}>
                  {isBusy ? (
                    <span className="flex w-full items-center justify-center gap-2">
                      <Skeleton className="h-4 w-4 rounded-full" />
                      <Skeleton className="h-4 w-32" />
                    </span>
                  ) : (
                    "Create account"
                  )}
                </Button>
              </form>

              <p className="text-sm text-slate-300">
                Already have an account?{" "}
                <Link className="font-medium text-sky-200 hover:text-sky-100" href="/login">
                  Log in
                </Link>
                .
              </p>

              <p className="pt-1 text-xs text-slate-400">By creating an account, you agree to GymStack terms and privacy policy.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
