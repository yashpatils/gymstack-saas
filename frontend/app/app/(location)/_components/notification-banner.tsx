'use client';

import { useState } from 'react';
import { getNotificationPermissionState, subscribeToPush } from '../../../../src/lib/push';

export function NotificationBanner() {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window === 'undefined') {
      return 'default';
    }
    return getNotificationPermissionState();
  });

  if (permission === 'granted' || permission === 'unsupported') {
    return null;
  }

  const enable = async () => {
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') {
      await subscribeToPush();
    }
  };

  return (
    <div className="rounded-xl border border-cyan-400/40 bg-cyan-500/10 p-3 text-sm text-cyan-100">
      <p className="font-medium">Enable notifications for booking confirmations and reminders.</p>
      <button
        type="button"
        className="mt-2 rounded-md bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-900"
        onClick={() => {
          void enable();
        }}
      >
        Enable notifications
      </button>
    </div>
  );
}
