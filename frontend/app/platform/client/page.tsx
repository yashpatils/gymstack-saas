import { PageHeader } from "../../../src/components/common/PageHeader";

export default function ClientDashboardPage() {
  return (
    <section className="space-y-6">
      <PageHeader title="Client Dashboard" subtitle="Your plan, schedule, and attendance at a glance." />
      <div className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-2xl border border-border bg-card/70 p-5">
          <h2 className="text-sm uppercase tracking-[0.2em] text-muted-foreground">My plan</h2>
          <p className="mt-2 text-lg font-semibold">Strength Base · 8 weeks</p>
        </article>
        <article className="rounded-2xl border border-border bg-card/70 p-5">
          <h2 className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Attendance</h2>
          <p className="mt-2 text-lg font-semibold">6 sessions this month</p>
        </article>
        <article className="rounded-2xl border border-border bg-card/70 p-5">
          <h2 className="text-sm uppercase tracking-[0.2em] text-muted-foreground">My gym</h2>
          <p className="mt-2 text-lg font-semibold">GymStack Club · Downtown</p>
        </article>
      </div>
    </section>
  );
}
