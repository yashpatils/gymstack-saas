'use client';

import { PageHeader } from '../../../src/components/common/PageHeader';
import { CoachClientChat } from '../../../src/components/coaching/CoachClientChat';

export default function ClientDashboardPage() {
  return (
    <section className="space-y-6">
      <PageHeader title="Client Dashboard" subtitle="Chat with your assigned coach." />
      <CoachClientChat mode="client" />
    </section>
  );
}
