'use client';

import { useState } from 'react';
import { getNotificationPermissionState, subscribeToPush, unsubscribeFromPush } from '../../../../src/lib/push';

export default function LocationSettingsPage() {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window === 'undefined') {
      return 'default';
    }
    return getNotificationPermissionState();
  });

  const enabled = permission === 'granted';

  const toggle = async () => {
    if (enabled) {
      await unsubscribeFromPush();
      setPermission('default');
      return;
    }

    const nextPermission = await Notification.requestPermission();
    setPermission(nextPermission);
    if (nextPermission === 'granted') {
      await subscribeToPush();
    }
  };

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">App Settings</h2>
      <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4">
        <p className="text-sm text-slate-300">Push notifications</p>
        <button type="button" className="mt-3 rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-900" onClick={() => void toggle()}>
          {enabled ? 'Disable notifications' : 'Enable notifications'}
        </button>
        {permission === 'denied' ? <p className="mt-2 text-xs text-amber-300">Notifications are blocked in your browser settings.</p> : null}
      </div>
      <p className="text-xs text-slate-400">Powered by Gym Stack</p>
    </section>
  );
}
