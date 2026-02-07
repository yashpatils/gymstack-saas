import {
  Badge,
  Button,
  Card,
  PageHeader,
  PageShell,
  SectionTitle,
  StatCard,
  Table,
} from "../../components/ui";

export default function TenantDashboardPage() {
  return (
    <PageShell>
      <PageHeader
        title="Tenant Dashboard"
        subtitle="Track engagement, revenue, and trainer coverage for your gym today."
        actions={<Button>Invite staff</Button>}
      />

      <div className="grid grid-3">
        <StatCard
          label="Active members"
          value="1,248"
          detail="Up 6% compared to last month."
        />
        <StatCard
          label="Monthly revenue"
          value="$84,120"
          detail="Includes memberships and personal training."
        />
        <StatCard
          label="Trainer coverage"
          value="92%"
          detail="Slots with trainers assigned this week."
        />
      </div>

      <section className="section">
        <SectionTitle>Today at a glance</SectionTitle>
        <div className="grid grid-2">
          <Card
            title="Check-in flow"
            description="Real-time lobby traffic and front desk workload."
            footer={<Badge tone="success">Smooth operations</Badge>}
          />
          <Card
            title="Billing alerts"
            description="Monitor upcoming renewals and failed payments."
            footer={<Badge tone="warning">5 follow-ups needed</Badge>}
          />
        </div>
      </section>

      <section className="section">
        <SectionTitle>Upcoming sessions</SectionTitle>
        <Card title="Trainer assignments" description="Next 3 high-impact sessions.">
          <Table
            headers={["Member", "Trainer", "Time", "Status"]}
            rows={[
              ["Ava Nguyen", "Marcus Reed", "9:00 AM", <Badge>Confirmed</Badge>],
              ["Leo Martinez", "Priya Shah", "11:30 AM", <Badge>Confirmed</Badge>],
              [
                "Jordan Lee",
                "Sofia Brooks",
                "2:00 PM",
                <Badge tone="warning">Pending</Badge>,
              ],
            ]}
          />
        </Card>
      </section>
    </PageShell>
  );
}
