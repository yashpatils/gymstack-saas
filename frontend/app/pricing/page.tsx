import Link from "next/link";
import { Card } from "../components/ui";
import { MarketingFooter, MarketingNavbar } from "../components/marketing-chrome";

const plans = [
  {
    name: "Starter",
    price: "$149",
    cadence: "/location/month",
    description: "For smaller studios building a strong operational foundation.",
    features: ["Membership management", "Billing + invoicing", "Basic automations", "Email support"],
  },
  {
    name: "Growth",
    price: "$399",
    cadence: "/location/month",
    description: "For scaling brands that need deeper workflows and reporting.",
    features: ["Everything in Starter", "Advanced analytics", "Trainer operations", "Priority support"],
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    cadence: "tailored annual plans",
    description: "For high-volume operators with custom security and integration needs.",
    features: ["Everything in Growth", "SSO + enhanced controls", "Custom integrations", "Dedicated success manager"],
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      <MarketingNavbar />

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-6 py-16">
        <section className="space-y-5 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Pricing</p>
          <h1 className="text-4xl font-semibold text-white md:text-5xl">Simple plans for every stage of growth.</h1>
          <p className="mx-auto max-w-2xl text-slate-300">
            No hidden fees. Start with a plan that fits your current footprint and scale when you are ready.
          </p>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={plan.featured ? "space-y-5 border-indigo-400/50 bg-gradient-to-b from-indigo-500/20 to-slate-950" : "space-y-5"}
            >
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-400">{plan.name}</p>
                <p className="mt-3 text-4xl font-semibold text-white">{plan.price}</p>
                <p className="text-sm text-slate-400">{plan.cadence}</p>
              </div>
              <p className="text-sm text-slate-300">{plan.description}</p>
              <ul className="space-y-2 text-sm text-slate-200">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-300" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className={`button w-full justify-center ${plan.featured ? "" : "secondary"}`}>
                {plan.featured ? "Start Growth trial" : "Get started"}
              </Link>
            </Card>
          ))}
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 text-center">
          <h2 className="text-2xl font-semibold text-white">Need a tailored rollout plan?</h2>
          <p className="mt-3 text-slate-300">
            We can help migrate your locations, configure workflows, and train your team for launch.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Link href="/signup" className="button">
              Start free trial
            </Link>
            <Link href="/faq" className="button secondary">
              View FAQ
            </Link>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
