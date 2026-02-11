import Link from "next/link";
import { Card } from "../components/ui";
import { MarketingFooter, MarketingNavbar } from "../components/marketing-chrome";

const faqs = [
  {
    question: "How long does onboarding take?",
    answer:
      "Most brands complete onboarding in 2 to 4 weeks, depending on number of locations and migration needs.",
  },
  {
    question: "Can we migrate from our current billing platform?",
    answer:
      "Yes. GymStack supports structured migration and data import assistance for members, plans, and payment history.",
  },
  {
    question: "Do you support multi-location permissions?",
    answer:
      "Absolutely. You can define platform, regional, and location-level roles with clear access boundaries.",
  },
  {
    question: "Is there a long-term contract?",
    answer:
      "No lock-in required for Starter and Growth plans. Enterprise contracts are tailored by rollout scope.",
  },
  {
    question: "What support is included?",
    answer:
      "All plans include product support. Growth and Enterprise include faster SLAs and strategic onboarding guidance.",
  },
  {
    question: "Can GymStack integrate with our tools?",
    answer:
      "Yes, we support common integration patterns and provide custom options for Enterprise customers.",
  },
];

export default function FaqPage() {
  return (
    <div className="min-h-screen">
      <MarketingNavbar />

      <main className="mx-auto flex w-full max-w-4xl flex-col gap-12 px-6 py-16">
        <section className="space-y-4 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">FAQ</p>
          <h1 className="text-4xl font-semibold text-white md:text-5xl">Answers to common questions.</h1>
          <p className="mx-auto max-w-2xl text-slate-300">
            Everything you need to know before moving your operations to GymStack.
          </p>
        </section>

        <section className="grid gap-5">
          {faqs.map((item) => (
            <Card key={item.question} className="space-y-3">
              <h2 className="text-xl font-semibold text-white">{item.question}</h2>
              <p className="text-sm leading-6 text-slate-300">{item.answer}</p>
            </Card>
          ))}
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 text-center">
          <h2 className="text-2xl font-semibold text-white">Still have questions?</h2>
          <p className="mt-2 text-slate-300">Create an account to explore the product or reach out to our onboarding team.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Link href="/signup" className="button">
              Start free trial
            </Link>
            <Link href="/pricing" className="button secondary">
              See pricing
            </Link>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
