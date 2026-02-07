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

export default function TenantBillingPage() {
  const invoices = [
    {
      id: "INV-2024-0913",
      date: "Sep 01, 2024",
      amount: "$12,480.00",
      status: "Paid",
      method: "Visa •••• 4242",
    },
    {
      id: "INV-2024-0862",
      date: "Aug 01, 2024",
      amount: "$12,480.00",
      status: "Paid",
      method: "Visa •••• 4242",
    },
    {
      id: "INV-2024-0725",
      date: "Jul 01, 2024",
      amount: "$11,920.00",
      status: "Paid",
      method: "ACH •• 7831",
    },
    {
      id: "INV-2024-0630",
      date: "Jun 01, 2024",
      amount: "$11,640.00",
      status: "Processing",
      method: "ACH •• 7831",
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Billing"
        subtitle="Stripe-inspired billing control center for subscriptions, invoices, and payment methods."
        actions={
          <div className="grid" style={{ gridAutoFlow: "column", gap: 12 }}>
            <Button variant="secondary">Manage payment methods</Button>
            <Button>Upgrade plan</Button>
          </div>
        }
      />

      <div className="grid grid-3">
        <StatCard
          label="Monthly recurring revenue"
          value="$84,120"
          detail="+8% from last month"
        />
        <StatCard
          label="Active subscriptions"
          value="1,248"
          detail="96% on annual plans"
        />
        <StatCard
          label="Outstanding balance"
          value="$1,920"
          detail="4 invoices in collections"
        />
      </div>

      <section className="section">
        <SectionTitle>Subscription management</SectionTitle>
        <div className="grid grid-2">
          <Card
            title="Current subscription"
            description="GymStack Scale · Billed annually · Renews Sep 30, 2024."
            footer={<Badge tone="success">Active</Badge>}
          >
            <Table
              headers={["Metric", "Value"]}
              rows={[
                ["Plan seats", "15 staff seats"],
                ["Locations", "8 of 10 used"],
                ["Members", "1,248 of 1,500"],
                ["Support", "Priority success manager"],
              ]}
            />
          </Card>
          <Card title="Upcoming charges" description="Preview your next invoice.">
            <Table
              headers={["Item", "Amount", "Frequency"]}
              rows={[
                ["Base subscription", "$10,800", "Annual"],
                ["Usage overage", "$1,040", "Monthly"],
                ["Add-on analytics", "$640", "Annual"],
              ]}
            />
            <div className="section">
              <Badge tone="warning">Projected total $12,480</Badge>
            </div>
          </Card>
        </div>
      </section>

      <section className="section">
        <SectionTitle>Invoices</SectionTitle>
        <Card
          title="Recent invoices"
          description="Download receipts and track payment status."
        >
          <Table
            headers={["Invoice", "Date", "Amount", "Payment method", "Status", ""]}
            rows={invoices.map((invoice) => [
              invoice.id,
              invoice.date,
              invoice.amount,
              invoice.method,
              invoice.status === "Paid" ? (
                <Badge tone="success">Paid</Badge>
              ) : (
                <Badge tone="warning">Processing</Badge>
              ),
              <Button variant="ghost">Download PDF</Button>,
            ])}
          />
        </Card>
      </section>

      <section className="section">
        <SectionTitle>Payment methods</SectionTitle>
        <div className="grid grid-3">
          <Card
            title="Primary card"
            description="Visa ending 4242 · Expires 08/26"
            footer={<Badge tone="success">Default</Badge>}
          />
          <Card
            title="Backup bank account"
            description="US Bank ·•• 7831 · Verified"
            footer={<Badge>ACH enabled</Badge>}
          />
          <Card
            title="Billing contacts"
            description="3 recipients for invoice notifications."
            footer={<Button variant="secondary">Manage contacts</Button>}
          />
        </div>
      </section>
    </PageShell>
  );
}
