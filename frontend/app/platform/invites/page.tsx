"use client";
import { FormEvent, useEffect, useState } from "react";
import { EmptyState } from "@/src/components/common/EmptyState";
import { PageHeader } from "@/src/components/common/PageHeader";
import { SectionCard } from "@/src/components/common/SectionCard";
import { UpgradeModal } from "@/src/components/common/UpgradeModal";
import { ApiFetchError } from "@/src/lib/apiFetch";
import { getBillingStatus } from "@/src/lib/billing";
import { useAuth } from "@/src/providers/AuthProvider";
import { createTenantInvite, listTenantInvites, revokeTenantInvite, type TenantInvite } from "@/src/lib/tenant";

const roleOptions = ["TENANT_LOCATION_ADMIN", "GYM_STAFF_COACH", "CLIENT"] as const;

type BillingStatus = {
  usage?: {
    staffSeatsUsed: number;
    maxStaffSeats: number;
  };
};

export default function InvitesPage() {
  const { activeContext, user } = useAuth();
  const [invites, setInvites] = useState<TenantInvite[]>([]);
  const [role, setRole] = useState<(typeof roleOptions)[number]>("GYM_STAFF_COACH");
  const [locationId, setLocationId] = useState("");
  const [email, setEmail] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [usage, setUsage] = useState<BillingStatus["usage"]>();
  const [upgradeCode, setUpgradeCode] = useState<string | null>(null);

  useEffect(() => {
    void listTenantInvites().then(setInvites);
    if (user?.id) {
      void getBillingStatus(user.id).then((status) => setUsage((status as BillingStatus).usage));
    }
  }, [user?.id]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!activeContext?.tenantId) return;
    try {
      const result = await createTenantInvite({ tenantId: activeContext.tenantId, role, locationId: locationId || undefined, email: email || undefined });
      setInviteLink(result.inviteLink);
      setInvites(await listTenantInvites());
    } catch (error) {
      if (error instanceof ApiFetchError) {
        const code = error.details && typeof error.details === "object" && "code" in error.details && typeof error.details.code === "string" ? error.details.code : null;
        if (code === "LIMIT_STAFF_SEATS_REACHED" || code === "UPGRADE_REQUIRED") {
          setUpgradeCode(code);
        }
      }
    }
  };

  return <section className="space-y-6"><PageHeader title="Invites" subtitle="Invite manager, staff, and clients with strict hierarchy rules." />
    {usage ? <p className="text-xs text-slate-400">Staff seats used: {usage.staffSeatsUsed}/{usage.maxStaffSeats}</p> : null}
    <SectionCard title="Create invite"><form className="grid gap-3 md:grid-cols-4" onSubmit={onSubmit}><select className="input" value={role} onChange={(event) => setRole(event.target.value as (typeof roleOptions)[number])}>{roleOptions.map((r) => <option key={r} value={r}>{r}</option>)}</select><input className="input" placeholder="Location ID (required for staff/client)" value={locationId} onChange={(event) => setLocationId(event.target.value)} /><input className="input" placeholder="Email (optional)" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /><button className="button" type="submit">Create invite</button></form>{inviteLink ? <div className="mt-3 flex items-center gap-3"><input className="input h-9 flex-1" readOnly value={inviteLink} /><button className="button secondary" type="button" onClick={() => navigator.clipboard.writeText(inviteLink)}>Copy</button></div> : null}</SectionCard>
    <SectionCard title="Existing invites">{invites.length === 0 ? <EmptyState title="No invites" description="Create your first invite to onboard your team." /> : <div className="space-y-2">{invites.map((invite) => <div key={invite.id} className="flex items-center justify-between rounded-xl border border-white/10 p-3 text-sm"><div>{invite.role} · {invite.email ?? "no email"} · {invite.status}</div><button className="button secondary button-sm" onClick={async () => { await revokeTenantInvite(invite.id); setInvites(await listTenantInvites()); }}>Revoke</button></div>)}</div>}</SectionCard>
    <UpgradeModal open={Boolean(upgradeCode)} errorCode={upgradeCode} title="Staff seat limit reached" description="Upgrade your plan to invite more staff." onClose={() => setUpgradeCode(null)} />
  </section>;
}
