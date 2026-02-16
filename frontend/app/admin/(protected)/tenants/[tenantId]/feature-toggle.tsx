"use client";

import { useState } from "react";
import { apiFetch } from "../../../../../src/lib/apiFetch";

export function FeatureToggle({ tenantId, initialWhiteLabel }: { tenantId: string; initialWhiteLabel: boolean }) {
  const [whiteLabel, setWhiteLabel] = useState(initialWhiteLabel);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onToggle() {
    setPending(true);
    setError(null);
    try {
      const result = await apiFetch<{ whiteLabelBranding: boolean }>(`/api/admin/tenants/${tenantId}/features`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ whiteLabelBranding: !whiteLabel }),
      });
      setWhiteLabel(result.whiteLabelBranding);
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Unable to update tenant features.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Feature flag</p>
      <p className="mt-2 text-sm text-slate-200">White Label Branding: <span className="font-semibold text-white">{whiteLabel ? "Enabled" : "Disabled"}</span></p>
      <button type="button" className="button secondary mt-3" onClick={() => void onToggle()} disabled={pending}>
        {pending ? "Saving..." : whiteLabel ? "Disable white label" : "Enable white label"}
      </button>
      {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}
    </div>
  );
}
