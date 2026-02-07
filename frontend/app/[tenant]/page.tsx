import {
  Button,
  PageHeader,
  PageShell,
  SectionTitle,
  StatCard,
} from "../components/ui";

export default function TenantHomePage() {
  return (
    <PageShell>
      <PageHeader
        title="Welcome back"
        subtitle="Start with a quick snapshot or head straight to your daily operations."
        actions={<Button>Open dashboard</Button>}
      />

      <div className="grid grid-3">
        <StatCard
          label="Daily check-ins"
          value="186"
          detail="Members checked in so far today."
        />
        <StatCard
          label="Trainer sessions"
          value="42"
          detail="Sessions scheduled for the next 24 hours."
        />
        <StatCard
          label="Renewals due"
          value="18"
          detail="Memberships expiring in the next 7 days."
        />
      </div>

      <section className="section">
        <SectionTitle>Recommended next steps</SectionTitle>
        <div className="grid grid-2">
          <div className="card">
            <h3>Review at-risk members</h3>
            <p>Identify low-activity members and trigger outreach campaigns.</p>
          </div>
          <div className="card">
            <h3>Update trainer coverage</h3>
            <p>Confirm coverage for peak evening times this week.</p>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
