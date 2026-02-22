'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiFetch, ApiFetchError } from '../../src/lib/apiFetch';
import { useAuth } from '../../src/providers/AuthProvider';

type SettingsTab = 'profile' | 'security';

type MyProfile = {
  id: string;
  name: string | null;
  email: string;
  twoStepEmailEnabled?: boolean;
};

export default function SettingsPage() {
  const { isAuthenticated } = useAuth();
  const [tab, setTab] = useState<SettingsTab>('profile');
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [name, setName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const data = await apiFetch<MyProfile>('/api/users/me', { method: 'GET' });
        if (!mounted) return;
        setProfile(data);
        setName(data.name ?? '');
      } catch (loadError) {
        if (!mounted) return;
        setError(loadError instanceof Error ? loadError.message : 'Unable to load settings.');
      }
    }

    if (isAuthenticated) {
      void load();
    }

    return () => {
      mounted = false;
    };
  }, [isAuthenticated]);

  const heading = useMemo(() => (tab === 'profile' ? 'Profile' : 'Security'), [tab]);

  async function saveProfile() {
    setStatus(null);
    setError(null);

    try {
      const updated = await apiFetch<MyProfile>('/api/users/me', {
        method: 'PATCH',
        body: { name },
      });
      setProfile(updated);
      setStatus('Profile updated.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save profile.');
    }
  }

  async function changePassword() {
    setStatus(null);
    setError(null);

    try {
      await apiFetch<{ ok: true }>('/api/users/me/change-password', {
        method: 'POST',
        body: { currentPassword, newPassword },
      });
      setCurrentPassword('');
      setNewPassword('');
      setStatus('Password updated.');
    } catch (passwordError) {
      if (passwordError instanceof ApiFetchError && passwordError.statusCode === 403) {
        setError('Not authorized');
        return;
      }
      setError(passwordError instanceof Error ? passwordError.message : 'Could not change password.');
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6 text-white">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <div className="flex gap-2">
        <button type="button" className="button secondary" onClick={() => setTab('profile')}>Profile</button>
        <button type="button" className="button secondary" onClick={() => setTab('security')}>Security</button>
      </div>

      <section className="rounded-xl border border-white/10 bg-slate-900/70 p-4" aria-label={heading}>
        {tab === 'profile' ? (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Profile</h2>
            <label className="block text-sm">Email</label>
            <p className="text-sm text-slate-300">{profile?.email ?? 'Loading...'}</p>
            <label className="block text-sm" htmlFor="name">Name</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded border border-white/20 bg-slate-950 px-3 py-2" />
            <button type="button" className="button" onClick={() => void saveProfile()}>Save profile</button>
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Security</h2>
            <p className="text-sm text-slate-300">2-step verification placeholder (Prompt 3).</p>
            <input
              placeholder="Current password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded border border-white/20 bg-slate-950 px-3 py-2"
            />
            <input
              placeholder="New password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded border border-white/20 bg-slate-950 px-3 py-2"
            />
            <button type="button" className="button" onClick={() => void changePassword()}>Change password</button>
          </div>
        )}
      </section>

      {status ? <p className="text-sm text-emerald-300">{status}</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </main>
  );
}
