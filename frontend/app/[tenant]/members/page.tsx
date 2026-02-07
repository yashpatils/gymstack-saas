import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  PageShell,
  SectionTitle,
  Skeleton,
  Table,
} from "../../components/ui";

export default function TenantMembersPage() {
  return (
    <PageShell>
      <PageHeader
        title="Members"
        subtitle="Manage member profiles, memberships, and engagement touchpoints."
        actions={
          <div className="pill-row">
            <Button variant="secondary">Export roster</Button>
            <Button>Add member</Button>
          </div>
        }
      />

      <div className="grid grid-3">
        <Card
          title="New sign-ups"
          description="38 members joined in the last 7 days."
          footer={<Badge tone="success">+12% week over week</Badge>}
        />
        <Card
          title="At-risk members"
          description="24 members flagged for low activity."
          footer={<Badge tone="warning">Needs outreach</Badge>}
        />
        <Card
          title="Membership mix"
          description="Standard: 62%, Premium: 28%, Elite: 10%."
        />
      </div>

      <section className="section">
        <SectionTitle>Member roster</SectionTitle>
        <Card title="Active members" description="Sorted by recent check-ins.">
          <Table
            headers={["Member", "Plan", "Last Visit", "Engagement"]}
            rows={[
              ["Maya Patel", "Premium", "Today", <Badge>Highly engaged</Badge>],
              [
                "Aaron Blake",
                "Standard",
                "Yesterday",
                <Badge tone="success">On track</Badge>,
              ],
              [
                "Lila Rodriguez",
                "Elite",
                "3 days ago",
                <Badge tone="warning">Needs follow-up</Badge>,
              ],
            ]}
          />
        </Card>
      </section>

      <section className="section">
        <SectionTitle>Engagement moments</SectionTitle>
        <div className="grid grid-2">
          <Card
            title="Personalized outreach"
            description="Building a new engagement segment."
          >
            <div className="skeleton-stack">
              <Skeleton className="skeleton-line medium" />
              <Skeleton className="skeleton-line" />
              <Skeleton className="skeleton-line short" />
            </div>
          </Card>
          <Card
            title="Celebrations"
            description="Milestones worth highlighting for your team."
          >
            <EmptyState
              title="No milestones today"
              description="Next birthday and anniversary alerts will appear here."
              icon={<span>★</span>}
              actions={<Button variant="secondary">Schedule highlight</Button>}
            />
          </Card>
        </div>
      </section>
    </PageShell>
  );
}
