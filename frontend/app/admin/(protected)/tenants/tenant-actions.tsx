'use client';

import { useState } from 'react';
import { apiFetch } from '@/src/lib/apiFetch';
import { setSupportModeContext } from '@/src/lib/supportMode';

export function TenantActions({ tenantId, isDisabled }: { tenantId: string; isDisabled: boolean }) {
  const [pending, setPending] = useState(false);

  const runToggle = async () => {
    setPending(true);
    try {
      await apiFetch(`/api/admin/tenants/${tenantId}/toggle-active`, { method: 'POST' });
      window.location.reload();
    } finally {
      setPending(false);
    }
  };

  const runImpersonate = async () => {
    setPending(true);
    try {
      await apiFetch('/api/admin/impersonate', {
        method: 'POST',
        body: JSON.stringify({ tenantId }),
      });
      setSupportModeContext({ tenantId });
      window.location.assign('/platform');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex gap-2">
      <button type="button" className="rounded-lg border border-white/20 px-2 py-1 text-xs" onClick={() => void runImpersonate()} disabled={pending}>Impersonate</button>
      <button type="button" className="rounded-lg border border-white/20 px-2 py-1 text-xs" onClick={() => void runToggle()} disabled={pending}>{isDisabled ? 'Enable' : 'Disable'}</button>
    </div>
  );
}
