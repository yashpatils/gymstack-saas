'use client';

import { PageHeader } from '../../../src/components/common/PageHeader';
import { CoachClientChat } from '../../../src/components/coaching/CoachClientChat';

export default function CoachDashboardPage() {
  return (
    <section className="space-y-6">
      <PageHeader title="Coach Dashboard" subtitle="Manage assigned clients and message them in real time." />
      <CoachClientChat mode="coach" />
    </section>
  );
}
