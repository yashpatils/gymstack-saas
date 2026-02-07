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

const growthBars = [
  { label: "Mon", value: 48 },
  { label: "Tue", value: 62 },
  { label: "Wed", value: 70 },
  { label: "Thu", value: 54 },
  { label: "Fri", value: 86 },
  { label: "Sat", value: 78 },
  { label: "Sun", value: 58 },
];

const attendancePoints = [
  { label: "6am", value: 30, left: "6%" },
  { label: "8am", value: 58, left: "22%" },
  { label: "10am", value: 68, left: "38%" },
  { label: "12pm", value: 42, left: "54%" },
  { label: "4pm", value: 76, left: "70%" },
  { label: "7pm", value: 90, left: "86%" },
];

const segmentMix = [
  { label: "Memberships", value: 52 },
  { label: "PT", value: 28 },
  { label: "Retail", value: 12 },
  { label: "Corporate", value: 8 },
];

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
        <div className="section-header">
          <SectionTitle>Analytics dashboard</SectionTitle>
          <div className="button-group">
            <Button variant="secondary">Export CSV</Button>
            <Button variant="ghost">Download PDF</Button>
          </div>
        </div>
        <div className="grid grid-2">
          <Card
            title="Member growth"
            description="Daily check-ins vs. new sign-ups across the week."
          >
            <div className="chart chart-bars">
              {growthBars.map((bar) => (
                <div className="chart-bar" key={bar.label}>
                  <span className="bar" style={{ height: `${bar.value}%` }} />
                  <span className="bar-label">{bar.label}</span>
                </div>
              ))}
            </div>
            <div className="chart-meta">
              <span>Avg. check-ins</span>
              <strong>1,024 / day</strong>
            </div>
          </Card>
          <Card
            title="Class attendance"
            description="Peak load across the day with staffing recommendations."
          >
            <div className="chart chart-line">
              <div className="line-path" />
              {attendancePoints.map((point) => (
                <div
                  className="line-point"
                  key={point.label}
                  style={{ left: point.left, bottom: `${point.value}%` }}
                >
                  <span />
                  <span className="point-label">{point.label}</span>
                </div>
              ))}
            </div>
            <div className="chart-meta">
              <span>Staffing forecast</span>
              <strong>+3 coaches at 6pm</strong>
            </div>
          </Card>
        </div>
        <div className="grid grid-2 section">
          <Card
            title="Revenue mix"
            description="Shift revenue toward higher margin services."
          >
            <div className="chart chart-stack">
              {segmentMix.map((segment) => (
                <div className="stack-row" key={segment.label}>
                  <div className="stack-label">
                    <span>{segment.label}</span>
                    <strong>{segment.value}%</strong>
                  </div>
                  <div className="stack-track">
                    <span
                      className="stack-fill"
                      style={{ width: `${segment.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card
            title="Retention signals"
            description="Members at risk of churn or upsell ready."
          >
            <div className="chart chart-signal">
              <div>
                <p>High risk</p>
                <strong>48 members</strong>
                <span className="signal-tag warning">Needs outreach</span>
              </div>
              <div>
                <p>Stable</p>
                <strong>842 members</strong>
                <span className="signal-tag success">On track</span>
              </div>
              <div>
                <p>Upsell-ready</p>
                <strong>96 members</strong>
                <span className="signal-tag">Upgrade target</span>
              </div>
            </div>
          </Card>
        </div>
      </section>

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
