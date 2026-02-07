import {
  Badge,
  Button,
  Card,
  PageHeader,
  PageShell,
  SectionTitle,
  Table,
} from "../../components/ui";

export default function TenantBillingPage() {
  return (
    <PageShell>
      <PageHeader
        title="Billing"
        subtitle="Optimize memberships, automate invoicing, and monitor renewals."
        actions={<Button>Update plans</Button>}
      />

      <div className="grid grid-3">
        <Card
          title="Monthly recurring revenue"
          description="$84,120 across active memberships."
          footer={<Badge tone="success">+8% this month</Badge>}
        />
        <Card
          title="Failed payments"
          description="6 payments require follow-up."
          footer={<Badge tone="warning">Dunning active</Badge>}
        />
        <Card
          title="Next renewal wave"
          description="120 memberships renew in 5 days."
        />
      </div>

      <section className="section">
        <SectionTitle>Membership plans</SectionTitle>
        <Card title="Active plans" description="Configure pricing and perks.">
          <Table
            headers={["Plan", "Price", "Members", "Status"]}
            rows={[
              ["Standard", "$59/mo", "772", <Badge>Live</Badge>],
              ["Premium", "$99/mo", "348", <Badge tone="success">Top plan</Badge>],
              ["Elite", "$149/mo", "128", <Badge tone="warning">Review</Badge>],
            ]}
          />
        </Card>
      </section>
    </PageShell>
  );
}
