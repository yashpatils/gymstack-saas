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
  Spinner,
} from "../components/ui/index";

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

export default function LoginPage() {
  const router = useRouter();
  const { login, loading: authLoading, user } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isBusy = authLoading || isSubmitting;
  const passwordHelper = useMemo(
    () => (showPassword ? "Make sure no one is looking at your screen." : "Use your GymStack account password."),
    [showPassword],
  );

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/platform");
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
      await login(email, password);
      toast.success("Logged in", "Welcome back to GymStack.");
      router.push("/platform");
    } catch (submitError) {
      const errorMessage =
        submitError instanceof Error
          ? submitError.message
          : "Unable to complete login.";
      setError(errorMessage);
      toast.error("Login failed", errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.35),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.2),transparent_40%)]" />

      <section className="relative mx-auto w-full max-w-5xl rounded-3xl border border-white/20 bg-white/10 p-1 shadow-2xl shadow-indigo-900/30 backdrop-blur-xl">
        <div className="grid overflow-hidden rounded-[22px] bg-slate-900/70 lg:grid-cols-[1.08fr_1fr]">
          <div className="flex flex-col justify-between gap-8 border-b border-white/10 p-8 lg:border-b-0 lg:border-r">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.35em] text-indigo-200/90">GymStack</p>
              <h1 className="text-3xl font-semibold leading-tight">Welcome back to your operations hub.</h1>
              <p className="max-w-md text-sm text-slate-300">
                Keep your members, teams, and locations synced in one place. Log in to continue managing your gyms.
              </p>
            </div>
            <ul className="space-y-3 text-sm text-slate-200">
              <li>• Unified dashboards for memberships and performance.</li>
              <li>• Role-aware tools built for owners and front desk teams.</li>
              <li>• Secure sign-in and session controls across tenants.</li>
            </ul>
          </div>

          <div className="p-6 sm:p-8">
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-semibold">Log in</h2>
                <p className="mt-1 text-sm text-slate-300">Use your work email and password to access GymStack.</p>
              </div>

              {error ? <Alert>{error}</Alert> : null}
              {authLoading ? <Alert tone="info">Checking existing session...</Alert> : null}

              <Button variant="secondary" disabled className="gap-3">
                <span className="text-base">G</span>
                Continue with Google
              </Button>

              <Divider label="or continue with email" />

              <form className="space-y-4" onSubmit={handleSubmit} noValidate>
                <Input
                  label="Email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  helperText="Use the same email you use for your organization."
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  error={fieldErrors.email}
                />

                <Input
                  label="Password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter at least 8 characters"
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
                  <Link href="/forgot-password" className="text-sm text-indigo-200 hover:text-indigo-100">
                    Forgot password?
                  </Link>
                </div>

                <Button type="submit" disabled={isBusy}>
                  {isBusy ? (
                    <>
                      <Spinner />
                      Logging in...
                    </>
                  ) : (
                    "Log in"
                  )}
                </Button>
              </form>

              <p className="text-sm text-slate-300">
                New to GymStack?{" "}
                <Link className="font-medium text-indigo-200 hover:text-indigo-100" href="/signup">
                  Create an account
                </Link>
                .
              </p>

              <p className="pt-1 text-xs text-slate-400">By continuing, you agree to GymStack terms and privacy policy.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
