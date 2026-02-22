"use client";

export const dynamic = "force-dynamic";

import {
  Badge,
  Button,
  Card,
  PageHeader,
  PageShell,
  SectionTitle,
} from "../../components/ui";
import { useBackendAction } from "../../components/use-backend-action";
import { useAuth } from "@/src/providers/AuthProvider";
import { getFeatureFlags, isFeatureEnabled, type FeatureFlags } from "@/src/lib/featureFlags";
import { TenantSlugEditor } from "@/src/components/settings/TenantSlugEditor";
import { TwoStepEmailToggle } from "@/src/components/settings/TwoStepEmailToggle";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

const rolePermissions = [
  {
    role: "Owner",
    description: "Full platform access and compliance controls.",
    members: "2 members",
    tone: "success" as const,
    permissions: [
      "Manage billing & contracts",
      "Configure global settings",
      "Approve payroll exports",
      "View audit logs",
      "Assign admin roles",
      "Manage data retention",
    ],
  },
  {
    role: "General Manager",
    description: "Operational oversight with limited finance access.",
    members: "5 members",
    tone: "warning" as const,
    permissions: [
      "Edit schedules & rosters",
      "Approve member discounts",
      "Manage equipment inventory",
      "Export performance reports",
      "Invite staff",
      "Review incident logs",
    ],
  },
  {
    role: "Coach",
    description: "Delivery-focused access to sessions and members.",
    members: "14 members",
    permissions: [
      "View member profiles",
      "Track session notes",
      "Update program templates",
      "Book facilities",
      "Message members",
      "Request time off",
    ],
  },
  {
    role: "Front Desk",
    description: "Day-to-day operations and member support.",
    members: "8 members",
    permissions: [
      "Check-in members",
      "Process retail sales",
      "Update contact info",
      "Create guest passes",
      "Resolve basic billing issues",
      "Schedule facility tours",
    ],
  },
];

const auditRows = [
  {
    action: "Role updated",
    detail: "General Manager can now approve discounts.",
    person: "Avery Kim",
    time: "2 hours ago",
  },
  {
    action: "New role assigned",
    detail: "Coach role assigned to Miguel R.",
    person: "Nina Patel",
    time: "Yesterday",
  },
  {
    action: "Permission request",
    detail: "Front Desk requested retail refund access.",
    person: "Priya Singh",
    time: "2 days ago",
  },
];

export default function TenantSettingsPage() {
  const { backendResponse, callBackend } = useBackendAction();
  const { activeContext, activeTenant, permissions, permissionKeys, user } = useAuth();
  const params = useParams<{ tenant: string }>();
  const [flags, setFlags] = useState<FeatureFlags>({});
  const [slugOverride, setSlugOverride] = useState<string | null>(null);
  const [twoStepEnabled, setTwoStepEnabled] = useState(false);

  useEffect(() => {
    setTwoStepEnabled(Boolean((user as { twoStepEmailEnabled?: boolean } | null)?.twoStepEmailEnabled));
  }, [user]);

  useEffect(() => {
    void getFeatureFlags().then(setFlags).catch(() => setFlags({}));
  }, []);

  const tenantId = activeContext?.tenantId ?? activeTenant?.id ?? null;
  const tenantSlug = slugOverride ?? (typeof params?.tenant === "string" ? params.tenant : "your-gym");
  const canManageTenantSettings = permissions.canManageTenant || permissionKeys.includes('tenant:manage');
  const canManageSecurity = permissionKeys.includes('security:manage') || permissions.canManageUsers || permissions.canManageTenant;

  const slugFeatureEnabled = useMemo(() => (
    isFeatureEnabled(flags, 'FEATURE_TENANT_SLUG_EDITOR') && isFeatureEnabled(flags, 'FEATURE_SECURE_PROFILE_UPDATES')
  ), [flags]);

  const twoStepFeatureEnabled = useMemo(() => isFeatureEnabled(flags, 'FEATURE_EMAIL_2SV'), [flags]);

  return (
    <PageShell>
      <PageHeader
        title="Settings & Roles"
        subtitle="Design role-based access across teams, locations, and compliance needs."
        actions={
          <div className="pill-row">
            <Button
              variant="secondary"
              onClick={() => callBackend("Export roles")}
            >
              Export roles
            </Button>
            <Button onClick={() => callBackend("Invite staff")}>
              Invite staff
            </Button>
          </div>
        }
      />
      {tenantId ? (
        <section className="section">
          <SectionTitle>Account security</SectionTitle>
          <div className="grid gap-4">
            <TenantSlugEditor
              tenantId={tenantId}
              currentSlug={tenantSlug}
              canEdit={canManageTenantSettings}
              featureEnabled={slugFeatureEnabled}
              onSlugChanged={(nextSlug) => setSlugOverride(nextSlug)}
            />
            <TwoStepEmailToggle
              enabled={twoStepEnabled}
              featureEnabled={twoStepFeatureEnabled}
              canManageSecurity={canManageSecurity}
              emailMaskedHint={user?.email}
              onChanged={setTwoStepEnabled}
            />
          </div>
        </section>
      ) : null}

      {backendResponse ? (
        <p className="text-sm text-slate-400">
          Backend response: {backendResponse}
        </p>
      ) : null}

      <div className="grid grid-3">
        <Card
          title="Active roles"
          description="6 roles across 4 locations."
          footer={<Badge tone="success">Policy synced</Badge>}
        />
        <Card
          title="Staff assigned"
          description="29 teammates mapped to a role."
          footer={<Badge>3 pending approvals</Badge>}
        />
        <Card
          title="Permission health"
          description="2 roles need a compliance review."
          footer={<Badge tone="warning">Review this week</Badge>}
        />
      </div>

      <section className="section">
        <SectionTitle>Role workspace</SectionTitle>
        <div className="tabs">
          <div className="tab-list" role="tablist" aria-label="Role settings">
            <button
              className="tab active"
              role="tab"
              aria-selected
              onClick={() => callBackend("Roles tab")}
            >
              Roles
            </button>
            <button
              className="tab"
              role="tab"
              aria-selected={false}
              onClick={() => callBackend("Permissions tab")}
            >
              Permissions
            </button>
            <button
              className="tab"
              role="tab"
              aria-selected={false}
              onClick={() => callBackend("Approval flow tab")}
            >
              Approval flow
            </button>
            <button
              className="tab"
              role="tab"
              aria-selected={false}
              onClick={() => callBackend("Audit log tab")}
            >
              Audit log
            </button>
          </div>
          <div className="tab-panel">
            <div className="grid grid-2">
              {rolePermissions.map((role) => (
                <Card
                  key={role.role}
                  title={role.role}
                  description={role.description}
                  footer={
                    <div className="role-footer">
                      <Badge tone={role.tone}>{role.members}</Badge>
                      <Button
                        variant="ghost"
                        onClick={() => callBackend("Edit role")}
                      >
                        Edit role
                      </Button>
                    </div>
                  }
                >
                  <div className="permission-list">
                    {role.permissions.map((permission) => (
                      <div className="permission-item" key={permission}>
                        <span className="permission-dot" aria-hidden />
                        <span>{permission}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <SectionTitle>Permission matrix</SectionTitle>
        <div className="card">
          <div className="permission-grid">
            <div className="permission-column">
              <h4>Member management</h4>
              <p>Access to profiles, billing updates, and communications.</p>
              <div className="permission-tags">
                <span className="permission-tag">Owner</span>
                <span className="permission-tag">General Manager</span>
                <span className="permission-tag">Coach</span>
                <span className="permission-tag muted">Front Desk</span>
              </div>
            </div>
            <div className="permission-column">
              <h4>Financial controls</h4>
              <p>Billing, refunds, and contract approvals.</p>
              <div className="permission-tags">
                <span className="permission-tag">Owner</span>
                <span className="permission-tag">General Manager</span>
                <span className="permission-tag muted">Coach</span>
                <span className="permission-tag muted">Front Desk</span>
              </div>
            </div>
            <div className="permission-column">
              <h4>Facilities & scheduling</h4>
              <p>Studio access, class booking, and rosters.</p>
              <div className="permission-tags">
                <span className="permission-tag">Owner</span>
                <span className="permission-tag">General Manager</span>
                <span className="permission-tag">Coach</span>
                <span className="permission-tag">Front Desk</span>
              </div>
            </div>
            <div className="permission-column">
              <h4>Data & reporting</h4>
              <p>Exports, compliance logs, and analytics dashboards.</p>
              <div className="permission-tags">
                <span className="permission-tag">Owner</span>
                <span className="permission-tag">General Manager</span>
                <span className="permission-tag muted">Coach</span>
                <span className="permission-tag muted">Front Desk</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <SectionTitle>Recent access activity</SectionTitle>
        <div className="grid grid-3">
          {auditRows.map((row) => (
            <Card
              key={`${row.action}-${row.person}`}
              title={row.action}
              description={row.detail}
              footer={
                <div className="audit-footer">
                  <span>{row.person}</span>
                  <span className="muted-text">{row.time}</span>
                </div>
              }
            />
          ))}
        </div>
      </section>
    </PageShell>
  );
}
