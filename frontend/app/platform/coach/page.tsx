import Link from "next/link";
import { PageHeader } from "../../../src/components/common/PageHeader";
import { EmptyState } from "../../../src/components/common/EmptyState";

export default function CoachDashboardPage() {
  return (
    <section className="space-y-6">
      <PageHeader title="Coach Dashboard" subtitle="Manage assigned clients and weekly sessions." actions={<Link href="/platform/team" className="button secondary">Ask for assignments</Link>} />
      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-border bg-card/70 p-5">
          <h2 className="text-lg font-semibold">Assigned clients</h2>
          <EmptyState title="No clients assigned" description="Ask admin to assign clients to your coaching queue." />
        </article>
        <article className="rounded-2xl border border-border bg-card/70 p-5">
          <h2 className="text-lg font-semibold">Next sessions</h2>
          <p className="mt-2 text-sm text-muted-foreground">No sessions yet. Create a plan to get started.</p>
          <div className="mt-4 flex gap-2"><button className="button">Create plan</button><button className="button secondary">Mark attendance</button></div>
        </article>
      </div>
    </section>
  );
}
