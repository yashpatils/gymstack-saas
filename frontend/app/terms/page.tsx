import type { Metadata } from "next";
import { MarketingFooter, MarketingNavbar } from "../components/marketing-chrome";
import { toAbsoluteUrl } from "../lib/site";

export const metadata: Metadata = {
  title: "GymStack Terms of Service",
  description: "Terms and conditions for using GymStack services.",
  alternates: { canonical: toAbsoluteUrl("/terms") },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen">
      <MarketingNavbar />
      <main className="mx-auto max-w-4xl space-y-6 px-6 py-16 text-slate-200">
        <h1 className="text-4xl font-semibold text-white">Terms of Service</h1>
        <p>By using GymStack, you agree to these terms. This template should be reviewed by legal counsel before launch.</p>
        <h2 className="text-2xl font-semibold text-white">Service usage</h2>
        <p>You are responsible for account security, lawful use, and accurate tenant data.</p>
        <h2 className="text-2xl font-semibold text-white">Billing and cancellations</h2>
        <p>Plans are billed in advance. Cancellations take effect at the end of the current cycle unless required otherwise by law.</p>
      </main>
      <MarketingFooter />
    </div>
  );
}
