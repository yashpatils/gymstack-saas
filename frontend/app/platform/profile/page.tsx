"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/src/lib/apiFetch";
import { useToast } from "../../../src/components/toast/ToastProvider";
import { cancelAccountDeletion, getAccountDeletionStatus, requestDeleteAccount } from "../../../src/lib/auth";

type AccountProfile = {
  email?: string;
  role?: string;
  createdAt?: string;
};

type PasswordErrors = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

function formatDate(value?: string): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString();
}

function validatePasswordChange(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
): PasswordErrors {
  const errors: PasswordErrors = {};

  if (!currentPassword) {
    errors.currentPassword = "Current password is required.";
  }

  if (!newPassword) {
    errors.newPassword = "New password is required.";
  } else if (newPassword.length < 8) {
    errors.newPassword = "New password must be at least 8 characters.";
  } else if (newPassword === currentPassword) {
    errors.newPassword = "Use a different password than your current one.";
  }

  if (!confirmPassword) {
    errors.confirmPassword = "Confirm your new password.";
  } else if (confirmPassword !== newPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
}

export default function PlatformProfilePage() {
  const toast = useToast();
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<PasswordErrors>({});

  const [deletePassword, setDeletePassword] = useState("");
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deletionStatus, setDeletionStatus] = useState<{ pendingDeletion: boolean; deletionRequestedAt: string | null; deletedAt: string | null } | null>(null);

  const isBusy = loadingProfile || submitting;

  const passwordHint = useMemo(() => {
    if (showNewPassword || showConfirmPassword || showCurrentPassword) {
      return "Your password is visible on screen. Make sure your environment is private.";
    }

    return "Choose a unique password with at least 8 characters.";
  }, [showConfirmPassword, showCurrentPassword, showNewPassword]);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      setLoadingProfile(true);
      setProfileError(null);

      try {
        const data = await apiFetch<AccountProfile>("/api/users/me", { method: "GET" });
        if (isMounted) {
          setProfile(data);
        }
      } catch {
        if (isMounted) {
          setProfile(null);
          setProfileError("Could not load profile details.");
        }
      } finally {
        if (isMounted) {
          setLoadingProfile(false);
        }
      }
    }

    async function loadDeletionStatus() {
      try {
        const status = await getAccountDeletionStatus();
        if (isMounted) {
          setDeletionStatus(status);
        }
      } catch {
        if (isMounted) {
          setDeletionStatus(null);
        }
      }
    }

    void loadProfile();
    void loadDeletionStatus();

    return () => {
      isMounted = false;
    };
  }, []);



  const handleDeleteRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (deletePassword.length < 8) {
      toast.error("Password required", "Enter your current password to request deletion.");
      return;
    }

    setDeleteSubmitting(true);
    try {
      await requestDeleteAccount(deletePassword);
      setDeletePassword("");
      toast.success("Deletion email sent", "Check your inbox to confirm account deletion.");
      setDeletionStatus(await getAccountDeletionStatus());
    } catch (error) {
      toast.error("Delete request failed", error instanceof Error ? error.message : "Unable to request account deletion.");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationErrors = validatePasswordChange(
      currentPassword,
      newPassword,
      confirmPassword,
    );

    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setSubmitting(true);

    try {
      await apiFetch("/api/users/me/password", {
        method: "PATCH",
        body: {
          currentPassword,
          newPassword,
        },
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setErrors({});
      toast.success("Password updated", "Your password was changed successfully.");
    } catch {
      toast.error("Password update failed", "Unable to update password. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="page space-y-6">
      <header className="page-header">
        <div>
          <h1 className="page-title">Profile</h1>
          <p className="page-subtitle">Manage account details and update your password.</p>
        </div>
      </header>

      <div className="card space-y-4">
        <h2 className="section-title">Account information</h2>
        {loadingProfile ? (
          <p className="text-sm text-slate-300">Loading account info...</p>
        ) : profileError ? (
          <p className="text-sm text-rose-300">{profileError}</p>
        ) : (
          <dl className="space-y-2 text-sm text-slate-200">
            <div>
              <dt className="text-slate-400">Email</dt>
              <dd>{profile?.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Role</dt>
              <dd>{profile?.role ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Created</dt>
              <dd>{formatDate(profile?.createdAt)}</dd>
            </div>
          </dl>
        )}
      </div>

      <div className="card space-y-4">
        <h2 className="section-title">Change password</h2>
        <p className="text-sm text-slate-300">{passwordHint}</p>

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <div className="space-y-1">
            <label className="text-sm text-slate-200" htmlFor="currentPassword">Current password</label>
            <div className="flex items-center gap-2">
              <input
                id="currentPassword"
                name="currentPassword"
                type={showCurrentPassword ? "text" : "password"}
                className="w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none ring-indigo-400 transition focus:ring"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="button secondary whitespace-nowrap"
                onClick={() => setShowCurrentPassword((value) => !value)}
              >
                {showCurrentPassword ? "Hide" : "Show"}
              </button>
            </div>
            {errors.currentPassword ? <p className="text-xs text-rose-300">{errors.currentPassword}</p> : null}
          </div>

          <div className="space-y-1">
            <label className="text-sm text-slate-200" htmlFor="newPassword">New password</label>
            <div className="flex items-center gap-2">
              <input
                id="newPassword"
                name="newPassword"
                type={showNewPassword ? "text" : "password"}
                className="w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none ring-indigo-400 transition focus:ring"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="button secondary whitespace-nowrap"
                onClick={() => setShowNewPassword((value) => !value)}
              >
                {showNewPassword ? "Hide" : "Show"}
              </button>
            </div>
            {errors.newPassword ? <p className="text-xs text-rose-300">{errors.newPassword}</p> : null}
          </div>

          <div className="space-y-1">
            <label className="text-sm text-slate-200" htmlFor="confirmPassword">Confirm new password</label>
            <div className="flex items-center gap-2">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                className="w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none ring-indigo-400 transition focus:ring"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="button secondary whitespace-nowrap"
                onClick={() => setShowConfirmPassword((value) => !value)}
              >
                {showConfirmPassword ? "Hide" : "Show"}
              </button>
            </div>
            {errors.confirmPassword ? <p className="text-xs text-rose-300">{errors.confirmPassword}</p> : null}
          </div>

          <button type="submit" className="button" disabled={isBusy}>
            {submitting ? "Updating password..." : "Update password"}
          </button>
        </form>
      </div>

      <div className="card space-y-4 border-rose-500/40">
        <h2 className="section-title text-rose-200">Delete account</h2>
        <p className="text-sm text-slate-300">Request account deletion. You will receive an email confirmation link before anything is removed.</p>
        {deletionStatus?.pendingDeletion ? (
          <div className="rounded-md border border-amber-300/40 bg-amber-500/10 p-3 text-sm text-amber-100">
            <p>Deletion pending since {formatDate(deletionStatus.deletionRequestedAt ?? undefined)}. Scheduled finalization: {formatDate(deletionStatus.deletedAt ?? undefined)}.</p>
            <button
              type="button"
              className="button secondary mt-2"
              onClick={async () => {
                await cancelAccountDeletion();
                setDeletionStatus(await getAccountDeletionStatus());
                toast.success("Deletion canceled", "Your account deletion request has been canceled.");
              }}
            >
              Cancel pending deletion
            </button>
          </div>
        ) : null}
        <form className="space-y-3" onSubmit={handleDeleteRequest}>
          <div className="space-y-1">
            <label className="text-sm text-slate-200" htmlFor="deletePassword">Confirm password</label>
            <input
              id="deletePassword"
              name="deletePassword"
              type="password"
              className="w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none ring-indigo-400 transition focus:ring"
              value={deletePassword}
              onChange={(event) => setDeletePassword(event.target.value)}
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="button secondary" disabled={deleteSubmitting}>
            {deleteSubmitting ? "Requesting..." : "Request deletion"}
          </button>
        </form>
      </div>

    </section>
  );
}
