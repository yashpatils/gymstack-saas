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
        title="Membership plan management"
        subtitle="Design, launch, and maintain membership offerings with clear pricing, perks, and renewal controls."
        actions={<Button>New plan</Button>}
      />

      <div className="grid grid-3">
        <Card
          title="Monthly recurring revenue"
          description="$84,120 across active memberships."
          footer={<Badge tone="success">+8% this month</Badge>}
        />
        <Card
          title="Plan upgrades"
          description="112 members upgraded this quarter."
          footer={<Badge tone="success">Higher value mix</Badge>}
        />
        <Card
          title="Renewal risk"
          description="26 members flagged for outreach."
          footer={<Badge tone="warning">Save playbook running</Badge>}
        />
      </div>

      <section className="section">
        <SectionTitle>Plans overview</SectionTitle>
        <div className="plan-grid">
          <div className="plan-card">
            <div className="plan-card-header">
              <div>
                <h3>Standard</h3>
                <p>Best for consistent gym-goers.</p>
              </div>
              <Badge>Live</Badge>
            </div>
            <div className="plan-price">
              $59<span>/mo</span>
            </div>
            <ul className="plan-list">
              <li>24/7 facility access</li>
              <li>2 guest passes monthly</li>
              <li>Basic wellness tracking</li>
            </ul>
            <div className="plan-actions">
              <Button variant="secondary">Edit plan</Button>
              <Button variant="ghost">Duplicate</Button>
            </div>
          </div>

          <div className="plan-card featured">
            <div className="plan-card-header">
              <div>
                <h3>Premium</h3>
                <p>Top plan with coaching sessions.</p>
              </div>
              <Badge tone="success">Top plan</Badge>
            </div>
            <div className="plan-price">
              $99<span>/mo</span>
            </div>
            <ul className="plan-list">
              <li>Unlimited group classes</li>
              <li>Quarterly body composition scan</li>
              <li>Priority support</li>
            </ul>
            <div className="plan-actions">
              <Button>Review perks</Button>
              <Button variant="ghost">Message members</Button>
            </div>
          </div>

          <div className="plan-card">
            <div className="plan-card-header">
              <div>
                <h3>Elite</h3>
                <p>High-touch training and recovery.</p>
              </div>
              <Badge tone="warning">Review</Badge>
            </div>
            <div className="plan-price">
              $149<span>/mo</span>
            </div>
            <ul className="plan-list">
              <li>Weekly 1:1 coaching</li>
              <li>Unlimited recovery suite</li>
              <li>Custom nutrition plan</li>
            </ul>
            <div className="plan-actions">
              <Button variant="secondary">Adjust pricing</Button>
              <Button variant="ghost">Pause enrollment</Button>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-split">
          <SectionTitle>Plan activity</SectionTitle>
          <Button variant="secondary">Export report</Button>
        </div>
        <Card title="Active plans" description="Configure pricing, perks, and enrollment status.">
          <Table
            headers={["Plan", "Price", "Members", "Status", "Renewal cadence"]}
            rows={[
              ["Standard", "$59/mo", "772", <Badge>Live</Badge>, "Monthly"],
              [
                "Premium",
                "$99/mo",
                "348",
                <Badge tone="success">Top plan</Badge>,
                "Monthly",
              ],
              [
                "Elite",
                "$149/mo",
                "128",
                <Badge tone="warning">Review</Badge>,
                "Quarterly",
              ],
            ]}
          />
        </Card>
      </section>

      <section className="section">
        <SectionTitle>Modal previews</SectionTitle>
        <div className="grid grid-2">
          <div className="modal-preview">
            <div className="modal-scrim" />
            <div className="modal-card">
              <div className="modal-header">
                <div>
                  <h3>Create a new plan</h3>
                  <p>Launch a limited-time offer for summer.</p>
                </div>
                <Badge>Draft</Badge>
              </div>
              <div className="modal-body">
                <div className="modal-row">
                  <span>Billing cadence</span>
                  <strong>Monthly</strong>
                </div>
                <div className="modal-row">
                  <span>Included sessions</span>
                  <strong>4 group + 1 PT</strong>
                </div>
                <div className="modal-row">
                  <span>Intro discount</span>
                  <strong>15% for 2 months</strong>
                </div>
              </div>
              <div className="modal-actions">
                <Button variant="secondary">Save draft</Button>
                <Button>Publish plan</Button>
              </div>
            </div>
          </div>

          <div className="modal-preview">
            <div className="modal-scrim" />
            <div className="modal-card">
              <div className="modal-header">
                <div>
                  <h3>Pause enrollment</h3>
                  <p>Manage demand before the fall rush.</p>
                </div>
                <Badge tone="warning">Requires review</Badge>
              </div>
              <div className="modal-body">
                <div className="modal-row">
                  <span>Plan impacted</span>
                  <strong>Elite</strong>
                </div>
                <div className="modal-row">
                  <span>Reopen date</span>
                  <strong>Oct 15, 2024</strong>
                </div>
                <div className="modal-row">
                  <span>Member communication</span>
                  <strong>Notify active members</strong>
                </div>
              </div>
              <div className="modal-actions">
                <Button variant="ghost">Cancel</Button>
                <Button variant="secondary">Schedule pause</Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
