"use client";

import { useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { PageHeader } from '../../../src/components/common/PageHeader';
import { SectionCard } from '../../../src/components/common/SectionCard';
import { submitFeedback, type FeedbackPriority } from '../../../src/lib/feedback';

const priorities: FeedbackPriority[] = ['low', 'medium', 'high'];

export default function FeedbackPage() {
  const pathname = usePathname();
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<FeedbackPriority>('medium');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const canSubmit = useMemo(() => message.trim().length > 0, [message]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    setSubmitting(true);
    setNotice(null);
    try {
      await submitFeedback({ message: message.trim(), page: pathname || '/platform/feedback', priority });
      setMessage('');
      setPriority('medium');
      setNotice('Feedback sent. Thanks for helping us ship safely each week.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Failed to send feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-6">
      <PageHeader title="Send feedback" subtitle="Tenant-scoped operational feedback from owner and staff." />
      <SectionCard title="Share context with priority">
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block text-muted-foreground">Message</span>
            <textarea className="input min-h-36 w-full" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={2000} required />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-muted-foreground">Priority</span>
            <select className="input w-full" value={priority} onChange={(event) => setPriority(event.target.value as FeedbackPriority)}>
              {priorities.map((entry) => (
                <option key={entry} value={entry}>{entry}</option>
              ))}
            </select>
          </label>
          <button type="submit" className="button" disabled={!canSubmit || submitting}>{submitting ? 'Sending…' : 'Send feedback'}</button>
          {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
        </form>
      </SectionCard>
    </section>
  );
}
