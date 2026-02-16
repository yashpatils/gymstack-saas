"use client";

export const dynamic = "force-dynamic";

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
import { useBackendAction } from "../../components/use-backend-action";
import { createInvite } from '@/src/lib/invites';
import { useAuth } from '@/src/providers/AuthProvider';

export default function TenantMembersPage() {
  const { backendResponse, callBackend } = useBackendAction();
  const { activeContext } = useAuth();

  const inviteClient = async () => {
    if (!activeContext?.locationId || !activeContext?.tenantId) return;
    const response = await createInvite({ tenantId: activeContext.tenantId, locationId: activeContext.locationId, role: 'CLIENT' });
    await navigator.clipboard.writeText(response.inviteUrl);
    callBackend(`Client invite copied: ${response.inviteUrl}`);
  };

  return (
    <PageShell>
      <PageHeader
        title="Members"
        subtitle="Manage member profiles, memberships, and engagement touchpoints."
        actions={
          <div className="pill-row">
            <Button
              variant="secondary"
              onClick={() => callBackend("Export roster")}
            >
              Export roster
            </Button>
            <Button onClick={() => callBackend("Add member")}>
              Add member
            </Button>
            <Button variant="secondary" onClick={() => void inviteClient()}>
              Invite Client
            </Button>
          </div>
        }
      />
      {backendResponse ? (
        <p className="text-sm text-slate-400">
          Backend response: {backendResponse}
        </p>
      ) : null}

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
              actions={
                <Button
                  variant="secondary"
                  onClick={() => callBackend("Schedule highlight")}
                >
                  Schedule highlight
                </Button>
              }
            />
          </Card>
        </div>
      </section>
    </PageShell>
  );
}
