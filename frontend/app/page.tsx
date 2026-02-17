import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card } from "./components/ui";
import { MarketingFooter, MarketingNavbar } from "./components/marketing-chrome";
import { LandingCta } from "./components/landing-cta";
import { toAbsoluteUrl } from "./lib/site";

export const metadata: Metadata = {
  title: "GymStack | Multi-Location Gym Management Platform",
  description: "GymStack helps gym operators run billing, scheduling, staff, and analytics across every location from one platform.",
  alternates: { canonical: toAbsoluteUrl("/") },
};

const featureList = [
  {
    title: "Membership + billing automation",
    description:
      "Automate renewals, retries, and plan upgrades without manual follow-up from your team.",
  },
  {
    title: "Multi-location visibility",
    description:
      "Track KPIs, revenue, and retention for every location from one clean control center.",
  },
  {
    title: "Trainer operations",
    description:
      "Coordinate schedules, classes, and payroll logic with built-in workflows for your staff.",
  },
  {
    title: "Member engagement journeys",
    description:
      "Trigger onboarding, milestone, and reactivation campaigns with high-converting templates.",
  },
  {
    title: "Smart alerts",
    description:
      "Get proactive signals for churn risk, payment failures, and attendance drops in real time.",
  },
  {
    title: "Enterprise-ready controls",
    description:
      "Role-based access, auditability, and scalable controls for high-growth gym brands.",
  },
];

const testimonials = [
  {
    id: "apex-athletics-avery-chen",
    quote:
      "GymStack helped us standardize operations across 14 locations in less than 8 weeks.",
    name: "Avery Chen",
    role: "Head of Operations, Apex Athletics",
  },
  {
    id: "peak-motion-maya-robinson",
    quote:
      "Our payment recovery improved immediately and our front desk team finally has breathing room.",
    name: "Maya Robinson",
    role: "COO, Peak Motion Studios",
  },
  {
    id: "core-society-luis-ortega",
    quote:
      "The product feels modern and the workflow tools made every location manager more consistent.",
    name: "Luis Ortega",
    role: "Regional Director, Core Society",
  },
];

function TestimonialsSection() {
  return (
    <section className="space-y-8" id="testimonials" aria-label="Testimonials">
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Testimonials</p>
        <h2 className="text-3xl font-semibold text-white">Teams Love the gymstack experience</h2>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        {testimonials.map((item) => (
          <Card key={item.id} className="space-y-5">
            <p className="text-base text-slate-200">“{item.quote}”</p>
            <div>
              <p className="text-sm font-semibold text-white">{item.name}</p>
              <p className="text-xs text-slate-400">{item.role}</p>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <MarketingNavbar />

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-24 px-6 py-16">
        <section className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <Badge>Purpose-built for modern gym operators</Badge>
            <h1 className="text-4xl font-semibold leading-tight text-white md:text-6xl">
              Run every gym location from one polished operating platform.
            </h1>
            <p className="max-w-2xl text-lg text-slate-300">
              GymStack unifies member billing, trainer workflows, and growth analytics so your team can scale faster with less overhead.
            </p>
            <div className="flex flex-wrap gap-4">
              <LandingCta />
            </div>
          </div>

          <Card className="space-y-5 bg-gradient-to-br from-indigo-500/10 via-slate-900/90 to-slate-950">
            {[
              { label: "Revenue captured", value: "$3.2M", detail: "+19% quarter-over-quarter" },
              { label: "Active members", value: "28,904", detail: "98% monthly retention" },
              { label: "Locations monitored", value: "42", detail: "Single source of truth" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
                <p className="mt-2 text-2xl font-semibold text-white">{item.value}</p>
                <p className="mt-1 text-sm text-slate-300">{item.detail}</p>
              </div>
            ))}
          </Card>
        </section>

        <section className="space-y-5" aria-label="Social proof">
          <p className="text-center text-xs uppercase tracking-[0.3em] text-slate-500">
            Trusted by scaling fitness brands
          </p>
          <div className="grid grid-cols-2 gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-sm font-medium text-slate-300 sm:grid-cols-3 lg:grid-cols-6">
            {[
              "Apex Fitness",
              "Pulse Labs",
              "Core Society",
              "Velocity Clubs",
              "Summit Training",
              "Forge Athletics",
            ].map((logo) => (
              <div key={logo} className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-4">
                {logo}
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-8" id="features">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Features</p>
            <h2 className="text-3xl font-semibold text-white md:text-4xl">
              Everything your team needs to scale efficiently.
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {featureList.map((feature) => (
              <Card key={feature.title} className="space-y-2">
                <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                <p className="text-sm text-slate-300">{feature.description}</p>
              </Card>
            ))}
          </div>
        </section>

        <TestimonialsSection />

        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">FAQ</p>
              <h2 className="text-2xl font-semibold text-white">Got questions before switching?</h2>
              <p className="text-slate-300">Read answers about onboarding, integrations, and support.</p>
            </div>
            <Link href="/faq" className="button secondary">
              Explore FAQ
            </Link>
          </div>
        </section>

        <section className="rounded-3xl border border-indigo-400/30 bg-gradient-to-r from-indigo-500/20 via-slate-900 to-slate-950 p-10 text-center">
          <div className="mx-auto max-w-2xl space-y-5">
            <h2 className="text-3xl font-semibold text-white md:text-4xl">Ready to modernize your gym operations?</h2>
            <p className="text-slate-300">Start your free trial today and see how GymStack helps your team move faster with less admin work.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/signup" className="button lg">
                Start free trial
              </Link>
              <Link href="/pricing" className="button secondary lg">
                Compare plans
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
