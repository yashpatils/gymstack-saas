import type { Metadata } from "next";
import { MarketingFooter, MarketingNavbar } from "../components/marketing-chrome";
import { toAbsoluteUrl } from "../lib/site";

export const metadata: Metadata = {
  title: "GymStack Privacy Policy",
  description: "Learn how GymStack collects, uses, and protects personal data.",
  alternates: { canonical: toAbsoluteUrl("/privacy") },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <MarketingNavbar />
      <main className="mx-auto max-w-4xl space-y-6 px-6 py-16 text-slate-200">
        <h1 className="text-4xl font-semibold text-white">Privacy Policy</h1>
        <p>GymStack processes personal data to provide tenant operations services. This policy is a placeholder and must be reviewed by counsel.</p>
        <h2 className="text-2xl font-semibold text-white">Data we collect</h2>
        <p>Account profile details, gym operational records, and technical telemetry needed for security and support.</p>
        <h2 className="text-2xl font-semibold text-white">Your rights</h2>
        <p>You can request access, corrections, or deletion by contacting support@gymstack.club.</p>
      </main>
      <MarketingFooter />
    </div>
  );
}
