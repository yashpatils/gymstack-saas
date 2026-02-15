'use client';

import { useState } from 'react';
import { getSupportModeContext, setSupportModeContext } from '../../src/lib/supportMode';

export function SupportModePanel() {
  const initialContext = getSupportModeContext();
  const [tenantId, setTenantId] = useState(initialContext?.tenantId ?? '');
  const [locationId, setLocationId] = useState(initialContext?.locationId ?? '');
  const [activeContext, setActiveContext] = useState(initialContext);

  const enableSupportMode = () => {
    if (!tenantId.trim()) {
      return;
    }

    const nextContext = {
      tenantId: tenantId.trim(),
      locationId: locationId.trim() ? locationId.trim() : undefined,
    };
    setSupportModeContext(nextContext);
    setActiveContext(nextContext);
  };

  const disableSupportMode = () => {
    setSupportModeContext(null);
    setActiveContext(null);
    setTenantId('');
    setLocationId('');
  };

  return (
    <section className="rounded-2xl border border-amber-300/40 bg-amber-500/10 p-4">
      <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-amber-200">Support Mode</h3>
      {activeContext ? (
        <p className="mt-2 text-sm text-amber-50">
          Support Mode: Tenant {activeContext.tenantId}
          {activeContext.locationId ? ` / Location ${activeContext.locationId}` : ''}
        </p>
      ) : (
        <p className="mt-2 text-sm text-amber-100">Not active.</p>
      )}

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <input
          className="rounded-md border border-white/20 bg-slate-900/60 px-3 py-2 text-sm text-white"
          placeholder="Tenant ID"
          value={tenantId}
          onChange={(event) => setTenantId(event.target.value)}
        />
        <input
          className="rounded-md border border-white/20 bg-slate-900/60 px-3 py-2 text-sm text-white"
          placeholder="Location ID (optional)"
          value={locationId}
          onChange={(event) => setLocationId(event.target.value)}
        />
      </div>

      <div className="mt-3 flex gap-2">
        <button type="button" onClick={enableSupportMode} className="rounded-md bg-amber-300 px-3 py-1 text-sm font-medium text-slate-900">
          Apply support context
        </button>
        <button type="button" onClick={disableSupportMode} className="rounded-md border border-amber-300/50 px-3 py-1 text-sm text-amber-100">
          Exit support mode
        </button>
      </div>
    </section>
  );
}
