'use client';

import { FormEvent, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getLastApiRequestId } from '../../src/lib/apiFetch';
import { useAuth } from '../../src/providers/AuthProvider';
import { buildSupportMailtoUrl, getSupportEmail } from '../../src/lib/support';

export default function ContactPage() {
  const { user, activeContext } = useAuth();
  const pathname = usePathname();
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const supportContext = useMemo(() => ({
    tenantId: activeContext?.tenantId,
    userId: user?.id,
    requestId: getLastApiRequestId(),
    route: pathname,
  }), [activeContext?.tenantId, pathname, user?.id]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    window.location.href = buildSupportMailtoUrl(supportContext, message);
    setNotice('Your email client has been opened with support context attached.');
  };

  return (
    <main className="page">
      <h1 className="page-title">Contact support</h1>
      <p className="page-subtitle">Need help? Send a message and we&apos;ll include routing metadata so support can respond faster.</p>

      <form className="card mt-6 space-y-4" onSubmit={onSubmit}>
        <p className="text-xs text-slate-400">Support email: {getSupportEmail()}</p>
        <label className="block text-sm text-slate-200" htmlFor="support-message">What happened?</label>
        <textarea id="support-message" value={message} onChange={(event) => setMessage(event.target.value)} rows={6} className="input" placeholder="Describe the issue and what you expected to happen." required />
        <button className="button" type="submit">Email support</button>
        {notice ? <p className="text-sm text-emerald-300">{notice}</p> : null}
      </form>
    </main>
  );
}
