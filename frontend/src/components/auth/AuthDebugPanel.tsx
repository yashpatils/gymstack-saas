'use client';

import { useAuth } from '../../providers/AuthProvider';

export function AuthDebugPanel() {
  const { isAuthenticated, token, meStatus, memberships, activeContext } = useAuth();

  const debugEnabled = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG === 'true';
  if (!debugEnabled) {
    return null;
  }

  return (
    <aside className="fixed bottom-3 right-3 z-50 w-72 rounded-xl border border-white/15 bg-slate-950/90 p-3 text-xs text-slate-100 shadow-xl">
      <p className="mb-2 font-semibold text-sky-300">Auth debug</p>
      <ul className="space-y-1">
        <li>isAuthenticated: {String(isAuthenticated)}</li>
        <li>hasAccessToken: {String(Boolean(token))}</li>
        <li>/me status: {meStatus ?? 'not requested'}</li>
        <li>memberships count: {memberships.length}</li>
        <li>activeContext: {activeContext ? `${activeContext.tenantId}${activeContext.locationId ? ` / ${activeContext.locationId}` : ''}` : 'none'}</li>
      </ul>
    </aside>
  );
}
