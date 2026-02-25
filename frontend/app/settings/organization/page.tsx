'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ApiFetchError } from '../../../src/lib/apiFetch';
import { getOrg } from '../../../src/lib/orgs';
import { OtpChallengeModal } from '../../../src/components/settings/OtpChallengeModal';
import { confirmChangeIntent, createChangeIntent } from '../../../src/lib/security';
import { useAuth } from '../../../src/providers/AuthProvider';

type OrgSettings = {
  id: string;
  name: string;
  whiteLabelEnabled: boolean;
};

export default function OrganizationSettingsPage() {
  const router = useRouter();
  const { permissions, activeContext } = useAuth();
  const [data, setData] = useState<OrgSettings | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [intentId, setIntentId] = useState<string | null>(null);
  const [intentExpiresAt, setIntentExpiresAt] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');

  const activeOrgId = activeContext?.tenantId ?? null;
  const allowed = permissions.canManageTenant;

  useEffect(() => {
    if (!activeOrgId) {
      router.replace('/select-org?next=/settings/organization');
      return;
    }

    if (!allowed) {
      return;
    }

    void getOrg(activeOrgId)
      .then((org) => {
        setData(org);
        setName(org.name);
      })
      .catch((loadError) => {
        if (loadError instanceof ApiFetchError && loadError.statusCode === 403) {
          setError('Not authorized');
          return;
        }
        setError(loadError instanceof Error ? loadError.message : 'Unable to load organization settings.');
      });
  }, [activeOrgId, allowed, router]);

  if (!activeOrgId) {
    return (
      <main className="mx-auto max-w-2xl space-y-3 p-6 text-white">
        <h1 className="text-2xl font-semibold">Organization settings</h1>
        <p>Organization context is required.</p>
        <Link href="/select-org?next=/settings/organization" className="button">Select organization</Link>
  
    </main>
    );
  }

  if (!allowed) {
    return <main className="mx-auto max-w-2xl p-6 text-white"><p>Not authorized</p></main>;
  }

  return (
    <main className="mx-auto max-w-2xl space-y-3 p-6 text-white">
      <h1 className="text-2xl font-semibold">Organization settings</h1>
      {error ? <p className="text-rose-300">{error}</p> : null}
      {data ? (
        <form className="space-y-3" onSubmit={async (event) => {
          event.preventDefault();
          const intent = await createChangeIntent({ type: 'ORG_SETTINGS_CHANGE', orgId: activeOrgId, payload: { name } });
          setIntentId(intent.id);
          setIntentExpiresAt(intent.expiresAt);
          setMaskedEmail(intent.maskedEmail);
        }}>
          <label className="block text-sm">Name</label>
          <input className="input w-full" value={name} onChange={(event) => setName(event.target.value)} />
          <button type="submit" className="button">Save</button>
          <p className="text-slate-300">White-label: {data.whiteLabelEnabled ? 'On' : 'Off'}</p>
          <div className="pt-2">
            <Link href="/settings/organization/audit" className="text-sm text-sky-300 underline">View organization audit log</Link>
          </div>

        </form>
      ) : <p>Loading…</p>}

      {intentId ? (
        <OtpChallengeModal
          open
          title="Confirm organization settings"
          challengeId={intentId}
          expiresAt={intentExpiresAt}
          maskedEmail={maskedEmail}
          onClose={() => setIntentId(null)}
          onResend={async () => {
            const intent = await createChangeIntent({ type: 'ORG_SETTINGS_CHANGE', orgId: activeOrgId, payload: { name } });
            setIntentId(intent.id);
            setIntentExpiresAt(intent.expiresAt);
            setMaskedEmail(intent.maskedEmail);
            return { expiresAt: intent.expiresAt, maskedEmail: intent.maskedEmail };
          }}
          onVerify={async (otp) => {
            if (!intentId) return;
            await confirmChangeIntent(intentId, otp);
            setIntentId(null);
            const org = await getOrg(activeOrgId);
            setData(org);
          }}
        />
      ) : null}

    </main>
  );
}
