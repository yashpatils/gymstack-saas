import {
  Badge,
  Button,
  Card,
  PageHeader,
  PageShell,
  SectionTitle,
  StatCard,
} from "./components/ui";

export default function LandingPage() {
  return (
    <>
      <div className="top-banner">
        Launch-ready SaaS for multi-location gyms. New tenants onboard in under
        15 minutes.
      </div>
      <PageShell>
        <section className="hero">
          <Badge>Now accepting early access gyms</Badge>
          <h1>GymStack keeps every location in sync, from billing to trainers.</h1>
          <p>
            Deliver premium member experiences with unified dashboards, automated
            billing, and growth insights. Everything you need to launch, scale,
            and monetize your gyms.
          </p>
          <div className="hero-actions">
            <Button>Start your free preview</Button>
            <Button variant="secondary">Book a walkthrough</Button>
          </div>
          <div className="pill-row">
            <span className="pill">SOC2-ready</span>
            <span className="pill">Usage-based billing</span>
            <span className="pill">Multi-tenant analytics</span>
            <span className="pill">24/7 monitoring</span>
          </div>
        </section>

        <section className="section">
          <SectionTitle>Why operators pick GymStack</SectionTitle>
          <div className="grid grid-3">
            <Card
              title="Membership intelligence"
              description="Track churn risks, renewals, and upsells across every gym in one view."
            />
            <Card
              title="Trainer scheduling"
              description="Balance demand with smart availability plans and automatic reminders."
            />
            <Card
              title="Revenue guardrails"
              description="Automate failed payment recovery and monitor subscription health."
            />
          </div>
        </section>

        <section className="section">
          <SectionTitle>Live preview shortcuts</SectionTitle>
          <div className="grid grid-2">
            <Card
              title="Tenant dashboard preview"
              description="Jump into a tenant space to explore the operational dashboard."
              footer={<Button variant="secondary">Preview tenant UI</Button>}
            />
            <Card
              title="Platform admin preview"
              description="Review pricing plans and tenant oversight tools."
              footer={<Button variant="secondary">Preview platform UI</Button>}
            />
          </div>
        </section>

        <section className="section">
          <SectionTitle>Impact metrics</SectionTitle>
          <div className="grid grid-3">
            <StatCard
              label="Revenue retention"
              value="97%"
              detail="Tenants keep recurring revenue protected with smart dunning."
            />
            <StatCard
              label="Check-in efficiency"
              value="3.1x"
              detail="Reduce front-desk time with unified member profiles."
            />
            <StatCard
              label="Onboarding speed"
              value="12 min"
              detail="Average time to activate a new gym location."
            />
          </div>
        </section>

        <section className="section grid grid-2">
          <div className="cta-card">
            <PageHeader
              title="Launch with confidence"
              subtitle="Use the built-in templates, billing plans, and onboarding tasks to go live faster."
              actions={<Button>Get started now</Button>}
            />
          </div>
          <div className="cta-card">
            <SectionTitle>Everything included</SectionTitle>
            <ul className="nav-list">
              <li className="nav-item">Unified member CRM</li>
              <li className="nav-item">Trainer payroll reporting</li>
              <li className="nav-item">Automated plan upgrades</li>
              <li className="nav-item">Multi-location analytics</li>
            </ul>
          </div>
        </section>

        <footer className="footer">
          GymStack SaaS · Launch, manage, and scale modern gyms.
        </footer>
      </PageShell>
    </>
  );
}
