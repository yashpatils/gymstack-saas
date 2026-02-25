'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiFetch, ApiFetchError } from '../../src/lib/apiFetch';
import { useAuth } from '../../src/providers/AuthProvider';
import { getFeatureFlags, isFeatureEnabled, type FeatureFlags } from '../../src/lib/featureFlags';
import { TwoStepEmailToggle } from '../../src/components/settings/TwoStepEmailToggle';
import { OtpChallengeModal } from '../../src/components/settings/OtpChallengeModal';
import { confirmChangeIntent, createChangeIntent } from '../../src/lib/security';

type SettingsTab = 'profile' | 'security';

type MyProfile = {
  id: string;
  name: string | null;
  email: string;
  twoStepEmailEnabled?: boolean;
};

type AuthMe = {
  twoStepEmailEnabled?: boolean;
};

export default function SettingsPage() {
  const { isAuthenticated, refreshUser } = useAuth();
  const [tab, setTab] = useState<SettingsTab>('profile');
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [name, setName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flags, setFlags] = useState<FeatureFlags>({});
  const [twoStepEnabled, setTwoStepEnabled] = useState(false);

  const [passwordIntentId, setPasswordIntentId] = useState<string | null>(null);
  const [passwordIntentExpiresAt, setPasswordIntentExpiresAt] = useState<string>('');
  const [passwordIntentMaskedEmail, setPasswordIntentMaskedEmail] = useState<string>('');
  const [verifyingPasswordIntent, setVerifyingPasswordIntent] = useState(false);


  const twoStepFeatureEnabled = useMemo(() => isFeatureEnabled(flags, 'FEATURE_EMAIL_2SV'), [flags]);

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

  useEffect(() => {
    let mounted = true;

    async function loadSecurityState() {
      try {
        const me = await apiFetch<AuthMe>('/api/auth/me', { method: 'GET' });
        if (!mounted) {
          return;
        }
        setTwoStepEnabled(Boolean(me?.twoStepEmailEnabled));
      } catch {
        if (!mounted) {
          return;
        }
        setTwoStepEnabled(false);
      }
    }

    void getFeatureFlags().then(setFlags).catch(() => setFlags({}));

    if (isAuthenticated) {
      void loadSecurityState();
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
      const intent = await createChangeIntent({
        type: 'PASSWORD_CHANGE',
        payload: { currentPassword, newPassword },
      });
      setPasswordIntentId(intent.id);
      setPasswordIntentExpiresAt(intent.expiresAt);
      setPasswordIntentMaskedEmail(intent.maskedEmail);
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
            <TwoStepEmailToggle
              enabled={twoStepEnabled}
              featureEnabled={twoStepFeatureEnabled}
              canManageSecurity={isAuthenticated}
              emailMaskedHint={profile?.email}
              onChanged={setTwoStepEnabled}
            />
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


      {passwordIntentId ? (
        <OtpChallengeModal
          open
          title="Confirm password change"
          challengeId={passwordIntentId}
          expiresAt={passwordIntentExpiresAt}
          maskedEmail={passwordIntentMaskedEmail}
          verifying={verifyingPasswordIntent}
          onClose={() => setPasswordIntentId(null)}
          onResend={async () => {
            const intent = await createChangeIntent({ type: 'PASSWORD_CHANGE', payload: { currentPassword, newPassword } });
            setPasswordIntentId(intent.id);
            setPasswordIntentExpiresAt(intent.expiresAt);
            setPasswordIntentMaskedEmail(intent.maskedEmail);
            return { expiresAt: intent.expiresAt, maskedEmail: intent.maskedEmail };
          }}
          onVerify={async (otp) => {
            if (!passwordIntentId) return;
            setVerifyingPasswordIntent(true);
            try {
              await confirmChangeIntent(passwordIntentId, otp);
              setPasswordIntentId(null);
              setCurrentPassword('');
              setNewPassword('');
              setStatus('Password updated.');
              await refreshUser();
            } finally {
              setVerifyingPasswordIntent(false);
            }
          }}
        />
      ) : null}

      {status ? <p className="text-sm text-emerald-300">{status}</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </main>
  );
}
