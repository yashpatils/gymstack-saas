"use client";

import Link from "next/link";
import { PageHeader } from "../../../src/components/common/PageHeader";
import { SectionCard } from "../../../src/components/common/SectionCard";

const plans = [
  { name: "Starter", price: "$49", description: "Single location", featured: false },
  { name: "Scale", price: "$149", description: "Multi-location operations", featured: true },
  { name: "Enterprise", price: "Custom", description: "Advanced controls + support", featured: false },
];

export default function BillingPage() {
  const stripeConfigured = Boolean(process.env.NEXT_PUBLIC_STRIPE_PRICE_ID || "");

  return (
    <section className="space-y-6">
      <PageHeader title="Billing" subtitle="Manage plan, payment status, and Stripe setup." />

      <SectionCard title="Billing health">
        {!stripeConfigured ? (
          <div className="rounded-2xl border border-amber-300/40 bg-amber-400/10 p-4 text-sm text-amber-100">
            Stripe is not configured yet. Add Stripe keys in environment variables to enable upgrades.
          </div>
        ) : (
          <div className="rounded-2xl border border-emerald-300/40 bg-emerald-400/10 p-4 text-sm text-emerald-100">Stripe configuration detected.</div>
        )}
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <article key={plan.name} className={`section-card ${plan.featured ? "section-card-featured" : ""}`}>
            <p className="text-sm text-muted-foreground">{plan.name}</p>
            <p className="mt-2 text-3xl font-semibold">{plan.price}</p>
            <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
            <button type="button" className="button mt-4 w-full">{plan.featured ? "Current plan" : "Choose plan"}</button>
          </article>
        ))}
      </div>

      <SectionCard title="Plan comparison" actions={<Link href="/platform/support" className="button secondary">Need help choosing?</Link>}>
        <table className="table data-table">
          <thead><tr><th>Feature</th><th>Starter</th><th>Scale</th><th>Enterprise</th></tr></thead>
          <tbody>
            <tr><td>Locations</td><td>1</td><td>Up to 10</td><td>Unlimited</td></tr>
            <tr><td>Staff seats</td><td>5</td><td>50</td><td>Custom</td></tr>
            <tr><td>White-label domains</td><td>—</td><td>✓</td><td>✓</td></tr>
          </tbody>
        </table>
      </SectionCard>
    </section>
  );
}
