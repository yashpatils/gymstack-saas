"use client";

import {
  Badge,
  Button,
  Card,
  PageHeader,
  PageShell,
  SectionTitle,
  Table,
} from "../../components/ui";
import { useBackendAction } from "../../components/use-backend-action";

export default function PlatformTenantsPage() {
  const { backendResponse, callBackend } = useBackendAction();

  return (
    <PageShell>
      <PageHeader
        title="Tenant Directory"
        subtitle="Monitor onboarding, health, and expansion opportunities."
        actions={
          <Button onClick={() => callBackend("Invite tenant")}>
            Invite tenant
          </Button>
        }
      />
      {backendResponse ? (
        <p className="text-sm text-slate-400">
          Backend response: {backendResponse}
        </p>
      ) : null}

      <div className="grid grid-3">
        <Card
          title="Total tenants"
          description="47 active gyms across regions."
          footer={<Badge tone="success">+5 this quarter</Badge>}
        />
        <Card
          title="At-risk accounts"
          description="4 tenants need onboarding support."
          footer={<Badge tone="warning">Action required</Badge>}
        />
        <Card
          title="Expansion pipeline"
          description="12 gyms in evaluation stage."
        />
      </div>

      <section className="section">
        <SectionTitle>Tenant health</SectionTitle>
        <Card title="Account status" description="Latest activity and growth signals.">
          <Table
            headers={["Tenant", "Locations", "Plan", "Health"]}
            rows={[
              ["Elevate Fitness", "6", "Growth", <Badge>Healthy</Badge>],
              [
                "Pulse Athletics",
                "3",
                "Scale",
                <Badge tone="success">Expanding</Badge>,
              ],
              [
                "Northside Gym",
                "2",
                "Starter",
                <Badge tone="warning">Needs support</Badge>,
              ],
            ]}
          />
        </Card>
      </section>
    </PageShell>
  );
}
