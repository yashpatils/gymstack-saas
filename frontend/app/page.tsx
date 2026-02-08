"use client";

import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui";
import { useBackendAction } from "./components/use-backend-action";

export default function LandingPage() {
  const { backendResponse, callBackend } = useBackendAction();

  return (
    <div className="relative overflow-hidden">
      <header className="border-b border-white/5">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/20 text-lg font-semibold text-indigo-200">
              GS
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                GymStack
              </p>
              <p className="text-xs text-slate-500">Modern SaaS platform</p>
            </div>
          </div>
          <nav className="hidden items-center gap-8 text-sm text-slate-300 lg:flex">
            <a className="transition hover:text-white" href="#platform">
              Platform
            </a>
            <a className="transition hover:text-white" href="#workflows">
              Workflows
            </a>
            <a className="transition hover:text-white" href="#pricing">
              Pricing
            </a>
            <a className="transition hover:text-white" href="#stories">
              Stories
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              className="hidden lg:inline-flex"
              onClick={() => callBackend("Sign in")}
            >
              Sign in
            </Button>
            <Button onClick={() => callBackend("Book a demo")}>
              Book a demo
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-24 px-6 pb-28 pt-16">
        <section className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-8">
            <Badge>Stripe + Linear inspired</Badge>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold leading-tight text-white md:text-5xl">
                Launch a premium multi-location gym brand with one unified SaaS
                control center.
              </h1>
              <p className="text-lg text-slate-300">
                GymStack orchestrates billing, staffing, and member engagement
                with real-time intelligence, automated playbooks, and
                beautifully-designed experiences your operators actually love.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" onClick={() => callBackend("Start free")}>
                Start free
              </Button>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => callBackend("See the platform")}
              >
                See the platform
              </Button>
            </div>
            {backendResponse && (
              <p className="text-sm text-slate-300">
                Backend response: {backendResponse}
              </p>
            )}
            <div className="flex flex-wrap gap-6 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                SOC2-ready workflows
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-indigo-400" />
                Usage-based billing
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-sky-400" />
                24/7 member monitoring
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <Card className="space-y-6 bg-gradient-to-br from-white/10 via-slate-900/80 to-slate-950">
              <CardHeader>
                <CardTitle>Operational clarity in one glance</CardTitle>
                <CardDescription>
                  Consolidated dashboards across locations, trainers, and
                  memberships with predictive alerts.
                </CardDescription>
              </CardHeader>
              <div className="grid gap-4">
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      Revenue
                    </p>
                    <p className="text-xl font-semibold">$1.82M</p>
                  </div>
                  <p className="text-sm text-emerald-400">+18% MoM</p>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      Active Members
                    </p>
                    <p className="text-xl font-semibold">24,630</p>
                  </div>
                  <p className="text-sm text-indigo-300">98% retention</p>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      Trainer utilization
                    </p>
                    <p className="text-xl font-semibold">86%</p>
                  </div>
                  <p className="text-sm text-sky-300">+9 locations</p>
                </div>
              </div>
            </Card>
            <div className="grid grid-cols-2 gap-4 text-sm text-slate-400">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                Live sync for billing + CRM
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                Automated dunning flows
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                Trainer schedule optimizer
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                Smart access control
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-10" id="platform">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.4em] text-slate-500">
                Platform
              </p>
              <h2 className="text-3xl font-semibold text-white">
                Designed for operators who scale fast.
              </h2>
            </div>
            <Button
              variant="outline"
              onClick={() => callBackend("Explore platform")}
            >
              Explore platform
            </Button>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {[
              {
                title: "Location intelligence",
                description:
                  "Unified performance across every gym with anomaly detection and trend surfacing.",
              },
              {
                title: "Revenue orchestration",
                description:
                  "Automated billing recovery, plan changes, and revenue experiments with Stripe-level granularity.",
              },
              {
                title: "Member lifecycle",
                description:
                  "Linear-inspired task lanes for onboarding, retention, and referral automation.",
              },
            ].map((item) => (
              <Card key={item.title}>
                <CardHeader>
                  <CardTitle>{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <section
          className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]"
          id="workflows"
        >
          <div className="space-y-6">
            <p className="text-xs uppercase tracking-[0.4em] text-slate-500">
              Workflows
            </p>
            <h2 className="text-3xl font-semibold">
              Build repeatable playbooks for every gym touchpoint.
            </h2>
            <p className="text-base text-slate-300">
              Trigger automated sequences for new member activation, payroll
              approvals, and equipment maintenance. GymStack integrates with
              your existing stack while keeping the operator experience
              effortless.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                "Member onboarding",
                "Trainer payroll",
                "Facility compliance",
                "Community events",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
          <Card className="space-y-6">
            <CardHeader>
              <CardTitle>Automation overview</CardTitle>
              <CardDescription>
                Track every workflow with clear status, ownership, and impact.
              </CardDescription>
            </CardHeader>
            <div className="space-y-4">
              {[
                {
                  label: "Membership renewals",
                  value: "92% on-time",
                  tone: "text-emerald-400",
                },
                {
                  label: "Payment recovery",
                  value: "$124k saved",
                  tone: "text-indigo-300",
                },
                {
                  label: "Equipment maintenance",
                  value: "15 open tasks",
                  tone: "text-amber-300",
                },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
                >
                  <span className="text-slate-300">{row.label}</span>
                  <span className={`font-semibold ${row.tone}`}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          {[
            {
              value: "3.1x",
              label: "Faster check-in throughput",
              detail: "Reduce front desk time with unified member profiles.",
            },
            {
              value: "97%",
              label: "Revenue retention",
              detail: "Dunning sequences keep membership revenue protected.",
            },
            {
              value: "12 min",
              label: "Average launch time",
              detail: "Spin up a new location with reusable templates.",
            },
          ].map((stat) => (
            <Card key={stat.label} className="space-y-3">
              <p className="text-3xl font-semibold text-white">{stat.value}</p>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
                {stat.label}
              </p>
              <p className="text-sm text-slate-300">{stat.detail}</p>
            </Card>
          ))}
        </section>

        <section className="space-y-10" id="pricing">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.4em] text-slate-500">
                Pricing
              </p>
              <h2 className="text-3xl font-semibold text-white">
                Predictable pricing that grows with your portfolio.
              </h2>
            </div>
            <Button
              variant="outline"
              onClick={() => callBackend("Compare plans")}
            >
              Compare plans
            </Button>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {[
              {
                title: "Launch",
                price: "$299",
                detail: "Per location / month",
                features: [
                  "Core CRM + billing",
                  "Gym templates",
                  "Email support",
                ],
              },
              {
                title: "Scale",
                price: "$799",
                detail: "Per location / month",
                features: [
                  "Automation workflows",
                  "Trainer scheduling",
                  "Priority support",
                ],
                highlight: true,
              },
              {
                title: "Enterprise",
                price: "Custom",
                detail: "For 25+ locations",
                features: [
                  "Dedicated success team",
                  "Custom integrations",
                  "Advanced security",
                ],
              },
            ].map((plan) => (
              <Card
                key={plan.title}
                className={
                  plan.highlight
                    ? "border-indigo-400/60 bg-gradient-to-b from-indigo-500/20 via-slate-950/80 to-slate-950"
                    : ""
                }
              >
                <CardHeader>
                  <CardTitle>{plan.title}</CardTitle>
                  <CardDescription>{plan.detail}</CardDescription>
                </CardHeader>
                <p className="mt-6 text-3xl font-semibold">{plan.price}</p>
                <ul className="mt-6 space-y-3 text-sm text-slate-300">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-8 w-full"
                  variant={plan.highlight ? "default" : "secondary"}
                  onClick={() => callBackend(`Choose ${plan.title}`)}
                >
                  Choose {plan.title}
                </Button>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-10" id="stories">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.4em] text-slate-500">
                Stories
              </p>
              <h2 className="text-3xl font-semibold">
                Operators switching to GymStack move faster.
              </h2>
            </div>
            <Button
              variant="outline"
              onClick={() => callBackend("Read case studies")}
            >
              Read case studies
            </Button>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {[
              {
                quote:
                  "We opened five new studios in one quarter and still kept every billing touchpoint under control.",
                name: "Jamie Lee",
                role: "COO, Flexline Fitness",
              },
              {
                quote:
                  "GymStack gave us Linear-style execution lanes for everything from equipment upgrades to onboarding.",
                name: "Marcus Nunez",
                role: "VP Operations, Studio Forge",
              },
            ].map((story) => (
              <Card key={story.name} className="space-y-6">
                <p className="text-lg text-slate-100">“{story.quote}”</p>
                <div>
                  <p className="text-sm font-semibold text-white">{story.name}</p>
                  <p className="text-xs text-slate-400">{story.role}</p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-gradient-to-r from-indigo-500/20 via-slate-950/80 to-slate-950 p-10 text-center">
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-6">
            <h2 className="text-3xl font-semibold text-white">
              Ready to orchestrate every gym location in minutes?
            </h2>
            <p className="text-base text-slate-300">
              Book a personalized walkthrough and see how GymStack harmonizes
              revenue, training, and member journeys.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" onClick={() => callBackend("Start free")}>
                Start free
              </Button>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => callBackend("Talk to sales")}
              >
                Talk to sales
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 py-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-6 px-6 text-center text-sm text-slate-500 md:flex-row md:text-left">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-500">
              GymStack SaaS
            </p>
            <p className="text-sm text-slate-400">
              Launch, manage, and scale premium gym experiences.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <a className="transition hover:text-white" href="#platform">
              Platform
            </a>
            <a className="transition hover:text-white" href="#workflows">
              Workflows
            </a>
            <a className="transition hover:text-white" href="#pricing">
              Pricing
            </a>
            <a className="transition hover:text-white" href="#stories">
              Stories
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
