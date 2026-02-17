"use client";

import { useState } from "react";
import { apiFetch } from "@/src/lib/apiFetch";

type OverrideState = {
  maxLocationsOverride: number | null;
  maxStaffSeatsOverride: number | null;
  whiteLabelOverride: boolean | null;
};

export function PlanOverrideForm({ tenantId, initialOverride }: { tenantId: string; initialOverride: OverrideState | null }) {
  const [maxLocationsOverride, setMaxLocationsOverride] = useState<string>(initialOverride?.maxLocationsOverride?.toString() ?? "");
  const [maxStaffSeatsOverride, setMaxStaffSeatsOverride] = useState<string>(initialOverride?.maxStaffSeatsOverride?.toString() ?? "");
  const [whiteLabelOverride, setWhiteLabelOverride] = useState<string>(initialOverride?.whiteLabelOverride === null || typeof initialOverride?.whiteLabelOverride === "undefined" ? "" : String(initialOverride.whiteLabelOverride));
  const [saving, setSaving] = useState(false);

  async function onSave() {
    setSaving(true);
    try {
      await apiFetch(`/api/admin/tenants/${tenantId}/plan`, {
        method: "PATCH",
        body: {
          maxLocationsOverride: maxLocationsOverride ? Number(maxLocationsOverride) : null,
          maxStaffSeatsOverride: maxStaffSeatsOverride ? Number(maxStaffSeatsOverride) : null,
          whiteLabelOverride: whiteLabelOverride === "" ? null : whiteLabelOverride === "true",
        },
      });
      window.location.reload();
    } finally {
      setSaving(false);
    }
  }

  return <article className="rounded-2xl border border-white/10 bg-slate-900/40 p-5">
    <h2 className="text-lg font-semibold text-white">Override limits</h2>
    <div className="mt-4 grid gap-3 md:grid-cols-3">
      <label className="text-sm text-slate-200">Max locations<input className="input mt-1" value={maxLocationsOverride} onChange={(event) => setMaxLocationsOverride(event.target.value)} type="number" min={1} placeholder="Use plan default" /></label>
      <label className="text-sm text-slate-200">Max staff seats<input className="input mt-1" value={maxStaffSeatsOverride} onChange={(event) => setMaxStaffSeatsOverride(event.target.value)} type="number" min={1} placeholder="Use plan default" /></label>
      <label className="text-sm text-slate-200">White-label override<select className="input mt-1" value={whiteLabelOverride} onChange={(event) => setWhiteLabelOverride(event.target.value)}><option value="">Use plan default</option><option value="true">Enabled</option><option value="false">Disabled</option></select></label>
    </div>
    <button className="button mt-4" onClick={() => void onSave()} disabled={saving} type="button">{saving ? "Saving..." : "Save overrides"}</button>
  </article>;
}
