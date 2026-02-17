import Link from "next/link";
import { adminApiFetch } from "../../../../_lib/server-admin-api";
import { PlanOverrideForm } from "./plan-override-form";

type TenantPlanResponse = {
  tenantId: string;
  plan: {
    key: string;
    displayName: string;
    maxLocations: number;
    maxStaffSeats: number;
    whiteLabelIncluded: boolean;
  };
  usage: {
    locationsUsed: number;
    staffSeatsUsed: number;
  };
  override: {
    maxLocationsOverride: number | null;
    maxStaffSeatsOverride: number | null;
    whiteLabelOverride: boolean | null;
  } | null;
};

export default async function TenantPlanPage({ params }: { params: { tenantId: string } }) {
  const data = await adminApiFetch<TenantPlanResponse>(`/api/admin/tenants/${params.tenantId}/plan`);

  return (
    <section className="space-y-5">
      <Link className="text-sm text-sky-300" href={`/admin/tenants/${params.tenantId}`}>← Back to tenant</Link>
      <header className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h1 className="text-2xl font-semibold text-white">Plan overrides</h1>
        <p className="mt-1 text-sm text-slate-300">Current plan: {data.plan.displayName} ({data.plan.key})</p>
        <p className="mt-1 text-xs text-slate-400">Usage: Locations {data.usage.locationsUsed}/{data.plan.maxLocations} · Staff seats {data.usage.staffSeatsUsed}/{data.plan.maxStaffSeats}</p>
      </header>
      <PlanOverrideForm tenantId={params.tenantId} initialOverride={data.override} />
    </section>
  );
}
