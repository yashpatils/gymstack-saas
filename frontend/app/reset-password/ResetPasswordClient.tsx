"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Alert, Button, Input, Spinner } from "../components/ui";
import { apiFetch } from "@/src/lib/apiFetch";

type FieldErrors = {
  password?: string;
  confirmPassword?: string;
};

function validatePasswords(password: string, confirmPassword: string): FieldErrors {
  const errors: FieldErrors = {};

  if (!password) {
    errors.password = "New password is required.";
  } else if (password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  }

  if (!confirmPassword) {
    errors.confirmPassword = "Please confirm your new password.";
  } else if (password !== confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
}

export default function ResetPasswordClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const hasToken = useMemo(() => token.trim().length > 0, [token]);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const errors = validatePasswords(password, confirmPassword);
    setFieldErrors(errors);

    if (!hasToken) {
      setError("Missing reset token. Request a new password reset link.");
      return;
    }

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      await apiFetch<{ ok: true }>("/api/auth/reset-password", {
        method: "POST",
        body: {
          token,
          newPassword: password,
        },
      });

      setSuccess("Your password has been reset. You can now log in.");
      setPassword("");
      setConfirmPassword("");
    } catch (submitError) {
      const errorMessage =
        submitError instanceof Error
          ? submitError.message
          : "Unable to reset password.";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-white">
      <section className="w-full max-w-md rounded-2xl border border-white/15 bg-slate-900/80 p-6 shadow-xl">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Reset your password</h1>
          <p className="text-sm text-slate-300">
            Enter a new password for your GymStack account.
          </p>
        </div>

        {!hasToken ? (
          <Alert>Invalid reset link. Request a new one from the forgot password page.</Alert>
        ) : null}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
          <Input
            label="New password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Enter at least 8 characters"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={fieldErrors.password}
          />

          <Input
            label="Confirm new password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter your new password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            error={fieldErrors.confirmPassword}
          />

          {error ? <Alert>{error}</Alert> : null}
          {success ? <Alert tone="info">{success}</Alert> : null}

          <Button type="submit" disabled={isSubmitting || !hasToken}>
            {isSubmitting ? (
              <>
                <Spinner />
                Resetting password...
              </>
            ) : (
              "Reset password"
            )}
          </Button>
        </form>

        <p className="mt-4 text-sm text-slate-300">
          Back to{" "}
          <Link className="font-medium text-sky-200 hover:text-sky-100" href="/login">
            login
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
