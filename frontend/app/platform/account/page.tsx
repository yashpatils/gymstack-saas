"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/src/components/common/PageHeader";
import { SectionCard } from "@/src/components/common/SectionCard";
import { useToast } from "@/src/components/toast/ToastProvider";
import { apiFetch, ApiFetchError } from "@/src/lib/apiFetch";
import { useAuth } from "@/src/providers/AuthProvider";

const sectionTitleClass = "text-slate-900 dark:text-white";
const labelClass = "text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400";
const valueClass = "text-base font-semibold text-slate-900 dark:text-white";
const helperClass = "text-sm text-slate-600 dark:text-slate-300";
const emptyValueClass = "text-slate-400 dark:text-slate-500";

export default function PlatformAccountPage() {
  const router = useRouter();
  const { user, memberships, activeContext, platformRole, tenantFeatures, logout, refreshUser } = useAuth();
  const { pushToast } = useToast();
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [savingName, setSavingName] = useState(false);

  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState(user?.email ?? "");
  const [otp, setOtp] = useState("");
  const [otpStage, setOtpStage] = useState<"idle" | "sending" | "sent" | "verifying">("idle");
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [resendInSeconds, setResendInSeconds] = useState(0);

  const membershipSummary = useMemo(() => {
    const byRole = memberships.reduce<Record<string, number>>((accumulator, membership) => {
      accumulator[membership.role] = (accumulator[membership.role] ?? 0) + 1;
      return accumulator;
    }, {});

    return Object.entries(byRole)
      .map(([role, count]) => `${role} (${count})`)
      .join(" • ");
  }, [memberships]);

  const canSwitchWorkspace = memberships.length > 1;


  useEffect(() => {
    if (resendInSeconds <= 0) {
      return;
    }
    const timer = window.setTimeout(() => setResendInSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendInSeconds]);


  const handleSaveName = async () => {
    setSavingName(true);
    try {
      await apiFetch("/api/account/display-name", {
        method: "PATCH",
        body: { name },
        credentials: "include",
        cache: "no-store",
      });
      await refreshUser();
      setEditingName(false);
      pushToast({ title: "Profile updated", description: "Your display name was updated.", variant: "success" });
    } catch (error) {
      const message = error instanceof ApiFetchError ? error.message : "Could not update name.";
      pushToast({ title: "Update failed", description: message, variant: "error" });
    } finally {
      setSavingName(false);
    }
  };

  const requestOtp = async () => {
    setOtpStage("sending");
    setEmailStatus("Sending OTP...");
    try {
      const response = await apiFetch<{ ok: true; resendInSeconds: number }>("/api/account/email-change/request-otp", {
        method: "POST",
        body: { newEmail },
        credentials: "include",
        cache: "no-store",
      });
      setOtpStage("sent");
      setResendInSeconds(response.resendInSeconds);
      setEmailStatus("OTP sent to your new email address.");
    } catch (error) {
      const message = error instanceof ApiFetchError ? error.message : "Could not send OTP.";
      setOtpStage("idle");
      setEmailStatus(message);
    }
  };

  const verifyOtp = async () => {
    setOtpStage("verifying");
    setEmailStatus("Verifying OTP...");
    try {
      await apiFetch("/api/account/email-change/verify-otp", {
        method: "POST",
        body: { newEmail, otp },
        credentials: "include",
        cache: "no-store",
      });
      await refreshUser();
      setEditingEmail(false);
      setOtp("");
      setOtpStage("idle");
      setEmailStatus("Email updated successfully.");
      pushToast({ title: "Email updated", description: "You may need to sign in again on other devices.", variant: "success" });
    } catch (error) {
      const message = error instanceof ApiFetchError ? error.message : "Could not verify OTP.";
      setOtpStage("sent");
      setEmailStatus(message);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
    router.refresh();
  };

  return (
    <section className="space-y-6">
      <PageHeader title="Account info" subtitle="Your user profile, workspace context, and membership summary." />

      <SectionCard title="Profile" className={sectionTitleClass}>
        <dl className="grid gap-4 text-sm md:grid-cols-2">
          <div>
            <dt className={labelClass}>Name</dt>
            {!editingName ? (
              <>
                <dd className={`mt-1 ${valueClass}`}>{user?.name || <span className={emptyValueClass}>—</span>}</dd>
                <button type="button" className="button secondary button-sm mt-2" onClick={() => { setName(user?.name ?? ""); setEditingName(true); }}>Edit</button>
              </>
            ) : (
              <div className="mt-2 space-y-2">
                <input className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" />
                <div className="flex gap-2">
                  <button type="button" className="button button-sm" onClick={handleSaveName} disabled={savingName}>{savingName ? "Saving..." : "Save"}</button>
                  <button type="button" className="button secondary button-sm" onClick={() => setEditingName(false)}>Cancel</button>
                </div>
              </div>
            )}
          </div>
          <div>
            <dt className={labelClass}>Email</dt>
            <dd className={`mt-1 ${valueClass}`}>{user?.email || <span className={emptyValueClass}>—</span>}</dd>
            {!editingEmail ? (
              <button type="button" className="button secondary button-sm mt-2" onClick={() => { setNewEmail(user?.email ?? ""); setEditingEmail(true); setEmailStatus(null); }}>Change email</button>
            ) : (
              <div className="mt-2 space-y-2">
                <input className="input" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} placeholder="new@email.com" />
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="button button-sm" onClick={requestOtp} disabled={otpStage === "sending" || otpStage === "verifying" || resendInSeconds > 0}>
                    {otpStage === "sending" ? "Sending OTP..." : resendInSeconds > 0 ? `Resend in ${resendInSeconds}s` : "Send OTP"}
                  </button>
                  <button type="button" className="button secondary button-sm" onClick={() => setEditingEmail(false)}>Cancel</button>
                </div>
                {otpStage === "sent" || otpStage === "verifying" ? (
                  <div className="space-y-2">
                    <input className="input" value={otp} onChange={(event) => setOtp(event.target.value)} placeholder="Enter 6-digit OTP" />
                    <button type="button" className="button button-sm" onClick={verifyOtp} disabled={otpStage === "verifying"}>{otpStage === "verifying" ? "Verifying..." : "Verify & update email"}</button>
                  </div>
                ) : null}
                {emailStatus ? <p className={helperClass}>{emailStatus}</p> : null}
              </div>
            )}
          </div>
          <div>
            <dt className={labelClass}>Platform role</dt>
            <dd className={`mt-1 ${helperClass}`}>{platformRole ?? "Standard user"}</dd>
          </div>
          <div>
            <dt className={labelClass}>Memberships</dt>
            <dd className={`mt-1 ${helperClass}`}>{membershipSummary || "No memberships"}</dd>
          </div>
        </dl>
      </SectionCard>

      <SectionCard title="Sessions & security" className={sectionTitleClass}>
        <p className={helperClass}>Manage active sessions from this account center.</p>
        <div className="mt-3 flex gap-2">
          <Link href="/platform/settings" className="button secondary button-sm">Open settings</Link>
          <button type="button" className="button button-sm" onClick={() => void handleLogout()}>Logout</button>
        </div>
      </SectionCard>

      <SectionCard title="Add-ons" className={sectionTitleClass}>
        <p className={helperClass}>White Label Branding: <span className={valueClass}>{tenantFeatures?.whiteLabelBranding ? "Enabled" : "Disabled"}</span></p>
        <p className={`mt-2 text-xs ${helperClass}`}>Upgrade in Billing to remove Gym Stack branding on custom domains for staff/client views.</p>
      </SectionCard>

      <SectionCard title="Active workspace context" className={sectionTitleClass}>
        <dl className="grid gap-3 text-sm md:grid-cols-2">
          <div>
            <dt className={labelClass}>Active tenant id</dt>
            <dd className="mt-1 font-mono text-xs text-slate-700 dark:text-slate-200">{activeContext?.tenantId ?? "—"}</dd>
          </div>
          <div>
            <dt className={labelClass}>Active location id</dt>
            <dd className="mt-1 font-mono text-xs text-slate-700 dark:text-slate-200">{activeContext?.locationId ?? "—"}</dd>
          </div>
          <div>
            <dt className={labelClass}>Active role</dt>
            <dd className={`mt-1 ${helperClass}`}>{activeContext?.role ?? "—"}</dd>
          </div>
        </dl>

        {canSwitchWorkspace ? (
          <div className="mt-4">
            <Link href="/select-workspace" className="button secondary button-sm">Switch workspace</Link>
          </div>
        ) : null}
      </SectionCard>
    </section>
  );
}
