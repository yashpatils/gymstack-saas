import {
  Badge,
  Button,
  Card,
  PageHeader,
  PageShell,
  SectionTitle,
  Table,
} from "../../components/ui";

export default function PlatformPlansPage() {
  return (
    <PageShell>
      <PageHeader
        title="Platform Plans"
        subtitle="Design and price subscription packages for tenant gyms."
        actions={<Button>Create plan</Button>}
      />

      <div className="grid grid-3">
        <Card
          title="Active plans"
          description="4 plans currently available to new tenants."
          footer={<Badge tone="success">Healthy adoption</Badge>}
        />
        <Card
          title="Enterprise requests"
          description="3 inbound requests for custom pricing."
          footer={<Badge tone="warning">Needs response</Badge>}
        />
        <Card
          title="Average revenue"
          description="$412 per tenant per month across all tiers."
        />
      </div>

      <section className="section">
        <SectionTitle>Plan catalog</SectionTitle>
        <Card title="Current offerings" description="Adjust pricing and entitlements.">
          <Table
            headers={["Plan", "Monthly", "Tenants", "Status"]}
            rows={[
              ["Starter", "$99", "12", <Badge>Live</Badge>],
              ["Growth", "$249", "26", <Badge tone="success">Most popular</Badge>],
              ["Scale", "$499", "9", <Badge>Live</Badge>],
            ]}
          />
        </Card>
      </section>
    </PageShell>
  );
}
