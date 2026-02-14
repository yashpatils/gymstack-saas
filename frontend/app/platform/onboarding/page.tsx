"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/providers/AuthProvider";
import { setOwnerOpsMode } from "@/src/lib/auth";
import { useToast } from "@/src/components/toast/ToastProvider";

type Choice = "OWNER_IS_MANAGER" | "INVITE_MANAGER";

export default function PlatformOnboardingPage() {
  const router = useRouter();
  const toast = useToast();
  const { onboarding, switchMode, chooseContext, refreshUser } = useAuth();
  const [choice, setChoice] = useState<Choice | null>(null);
  const [managerEmail, setManagerEmail] = useState("");
  const [managerName, setManagerName] = useState("");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [saving, setSaving] = useState(false);

  const tenantId = onboarding?.tenantId;
  const locationId = onboarding?.locationId;

  async function handleOwnerManagerChoice() {
    if (!tenantId || !locationId) return;
    setSaving(true);
    try {
      await setOwnerOpsMode({ tenantId, locationId, choice: "OWNER_IS_MANAGER" });
      await switchMode(tenantId, "MANAGER", locationId);
      await chooseContext(tenantId, locationId);
      await refreshUser();
      toast.success("Manager mode enabled", "You can switch back to Owner Console from your profile menu.");
      router.replace("/platform");
    } finally {
      setSaving(false);
    }
  }

  async function handleInvite(event: FormEvent) {
    event.preventDefault();
    if (!tenantId || !locationId) return;
    setSaving(true);
    try {
      const result = await setOwnerOpsMode({
        tenantId,
        locationId,
        choice: "INVITE_MANAGER",
        managerEmail,
        managerName: managerName || undefined,
      });
      setInviteUrl(result.inviteUrl ?? null);
      setEmailSent(Boolean(result.emailSent));
      await refreshUser();
      toast.success("Invite created", "Manager invite link is ready to share.");
    } finally {
      setSaving(false);
    }
  }

  if (!onboarding?.needsOpsChoice || !tenantId || !locationId) {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center justify-center px-6 py-16">
        <div className="rounded-3xl border border-white/20 bg-white/5 p-8 text-center backdrop-blur-xl">
          <p className="text-slate-200">Onboarding is already complete.</p>
          <button className="button mt-4" onClick={() => router.replace("/platform")}>Go to platform</button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-12">
      <section className="rounded-3xl border border-white/20 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
        <p className="text-xs uppercase tracking-[0.28em] text-sky-200">Owner onboarding</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">Will you manage the gym day-to-day?</h1>
        <p className="mt-2 text-sm text-slate-300">Choose your operations setup for this location.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <button className={`rounded-2xl border p-5 text-left ${choice === "OWNER_IS_MANAGER" ? "border-sky-300/60 bg-sky-500/15" : "border-white/20 bg-slate-900/70"}`} onClick={() => setChoice("OWNER_IS_MANAGER")}>
            <p className="text-lg font-semibold text-white">Yes, I’m the manager</p>
            <p className="mt-1 text-sm text-slate-300">Manage staff, clients, and schedule for this location.</p>
          </button>
          <button className={`rounded-2xl border p-5 text-left ${choice === "INVITE_MANAGER" ? "border-sky-300/60 bg-sky-500/15" : "border-white/20 bg-slate-900/70"}`} onClick={() => setChoice("INVITE_MANAGER")}>
            <p className="text-lg font-semibold text-white">No, invite a manager</p>
            <p className="mt-1 text-sm text-slate-300">Invite someone to run daily operations while you keep owner control.</p>
          </button>
        </div>
      </section>

      {choice === "OWNER_IS_MANAGER" ? (
        <section className="rounded-3xl border border-white/20 bg-white/5 p-8 backdrop-blur-xl">
          <h2 className="text-xl font-semibold text-white">Enable manager mode</h2>
          <p className="mt-2 text-sm text-slate-300">You’ll enter the Manager Console now and can switch back anytime.</p>
          <button className="button mt-5" disabled={saving} onClick={() => void handleOwnerManagerChoice()}>{saving ? "Saving..." : "Continue as manager"}</button>
        </section>
      ) : null}

      {choice === "INVITE_MANAGER" ? (
        <section className="rounded-3xl border border-white/20 bg-white/5 p-8 backdrop-blur-xl">
          <h2 className="text-xl font-semibold text-white">Invite a manager</h2>
          <form className="mt-4 grid gap-4" onSubmit={(event) => void handleInvite(event)}>
            <input className="input" type="email" placeholder="manager@gym.com" value={managerEmail} onChange={(event) => setManagerEmail(event.target.value)} required />
            <input className="input" placeholder="Manager name (optional)" value={managerName} onChange={(event) => setManagerName(event.target.value)} />
            <button className="button" type="submit" disabled={saving}>{saving ? "Sending..." : "Send invite"}</button>
          </form>

          {inviteUrl ? (
            <div className="mt-6 rounded-2xl border border-emerald-300/30 bg-emerald-500/10 p-4">
              <p className="font-medium text-emerald-200">Invite sent</p>
              <p className="mt-1 break-all text-xs text-slate-200">{inviteUrl}</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <button className="button secondary" onClick={() => navigator.clipboard.writeText(inviteUrl)} type="button">Copy invite link</button>
                <button className="button ghost" onClick={() => { setManagerEmail(""); setManagerName(""); setInviteUrl(null); }} type="button">Invite another manager</button>
                <button className="button" onClick={() => router.replace("/platform")} type="button">Continue to Owner Console</button>
              </div>
              <p className="mt-2 text-xs text-slate-300">Email sent: {emailSent ? "Yes" : "Pending"}</p>
            </div>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
