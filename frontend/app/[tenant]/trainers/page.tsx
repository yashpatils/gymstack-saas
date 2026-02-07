import {
  Badge,
  Button,
  Card,
  PageHeader,
  PageShell,
  SectionTitle,
  Table,
} from "../../components/ui";

export default function TenantTrainersPage() {
  return (
    <PageShell>
      <PageHeader
        title="Trainers"
        subtitle="Balance coverage, manage availability, and track trainer impact."
        actions={<Button>Schedule session</Button>}
      />

      <div className="grid grid-3">
        <Card
          title="Active trainers"
          description="18 trainers are scheduled this week."
          footer={<Badge tone="success">+3 new hires</Badge>}
        />
        <Card
          title="Coverage gaps"
          description="2 peak-time slots are unassigned."
          footer={<Badge tone="warning">Needs coverage</Badge>}
        />
        <Card
          title="Session quality"
          description="Average rating 4.8 / 5 from members."
        />
      </div>

      <section className="section">
        <SectionTitle>Trainer roster</SectionTitle>
        <Card title="Availability overview" description="Updated every 30 minutes.">
          <Table
            headers={["Trainer", "Specialty", "Next Slot", "Status"]}
            rows={[
              ["Priya Shah", "Strength & HIIT", "10:30 AM", <Badge>Open</Badge>],
              [
                "Marcus Reed",
                "Mobility",
                "1:00 PM",
                <Badge tone="success">Booked</Badge>,
              ],
              [
                "Sofia Brooks",
                "Performance",
                "3:30 PM",
                <Badge tone="warning">On call</Badge>,
              ],
            ]}
          />
        </Card>
      </section>
    </PageShell>
  );
}
