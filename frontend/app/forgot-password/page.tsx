"use client";

import Link from "next/link";
import { useState } from "react";
import { Alert, Button, Input, Spinner } from "../components/ui";
import { apiFetch } from "@/src/lib/apiFetch";

type FieldErrors = {
  email?: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email: string): FieldErrors {
  const errors: FieldErrors = {};

  if (!email.trim()) {
    errors.email = "Email is required.";
  } else if (!emailPattern.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  return errors;
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const errors = validateEmail(email);
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      await apiFetch<{ ok: true }>("/api/auth/forgot-password", {
        method: "POST",
        body: { email },
      });

      setSuccess("If an account exists for this email, a reset link has been sent.");
      setEmail("");
    } catch (submitError) {
      const errorMessage =
        submitError instanceof Error
          ? submitError.message
          : "Unable to request password reset.";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-white">
      <section className="w-full max-w-md rounded-2xl border border-white/15 bg-slate-900/80 p-6 shadow-xl">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Forgot your password?</h1>
          <p className="text-sm text-slate-300">
            Enter your account email and we&apos;ll send you a password reset link.
          </p>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
          <Input
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={fieldErrors.email}
          />

          {error ? <Alert>{error}</Alert> : null}
          {success ? <Alert tone="info">{success}</Alert> : null}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Spinner />
                Sending reset link...
              </>
            ) : (
              "Send reset link"
            )}
          </Button>
        </form>

        <p className="mt-4 text-sm text-slate-300">
          Remembered your password?{" "}
          <Link className="font-medium text-sky-200 hover:text-sky-100" href="/login">
            Back to login
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
