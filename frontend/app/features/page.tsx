import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "../components/ui";
import { MarketingFooter, MarketingNavbar } from "../components/marketing-chrome";
import { toAbsoluteUrl } from "../lib/site";

export const metadata: Metadata = {
  title: "GymStack Features | All-in-One Gym Operations",
  description: "Explore GymStack features for billing automation, scheduling, trainer workflows, and multi-location analytics.",
  alternates: {
    canonical: toAbsoluteUrl("/features"),
  },
};

const featureSections = [
  {
    title: "Operations automation",
    points: ["Automated memberships and failed payment recovery", "Class scheduling and staff rostering", "Configurable onboarding and reminders"],
  },
  {
    title: "Location intelligence",
    points: ["Cross-location KPI dashboards", "Retention and churn risk alerts", "Revenue and utilization reporting"],
  },
  {
    title: "Experience layer",
    points: ["Branded tenant pages and microsites", "Role-based access with audit trails", "Support workflows and ticketing"],
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen">
      <MarketingNavbar />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-16">
        <section className="space-y-4 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Features</p>
          <h1 className="text-4xl font-semibold text-white md:text-5xl">Everything required to launch and scale modern gym brands.</h1>
        </section>
        <section className="grid gap-6 md:grid-cols-3">
          {featureSections.map((section) => (
            <Card key={section.title} className="space-y-4">
              <h2 className="text-xl font-semibold text-white">{section.title}</h2>
              <ul className="space-y-2 text-sm text-slate-200">
                {section.points.map((point) => (
                  <li key={point}>• {point}</li>
                ))}
              </ul>
            </Card>
          ))}
        </section>
        <section className="rounded-3xl border border-indigo-400/30 bg-gradient-to-r from-indigo-500/20 via-slate-900 to-slate-950 p-10 text-center">
          <h2 className="text-3xl font-semibold text-white">Ready to launch with confidence?</h2>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Link href="/signup?role=tenant_owner" className="button lg">Start free</Link>
            <Link href="mailto:sales@gymstack.club" className="button secondary lg">Book a demo</Link>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
