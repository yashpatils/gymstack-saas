import type { Metadata } from "next";
import { MarketingFooter, MarketingNavbar } from "../components/marketing-chrome";
import { toAbsoluteUrl } from "../lib/site";

export const metadata: Metadata = {
  title: "GymStack Cookie Policy",
  description: "Understand how GymStack uses cookies and tracking technologies.",
  alternates: { canonical: toAbsoluteUrl("/cookies") },
};

export default function CookiesPage() {
  return (
    <div className="min-h-screen">
      <MarketingNavbar />
      <main className="mx-auto max-w-4xl space-y-6 px-6 py-16 text-slate-200">
        <h1 className="text-4xl font-semibold text-white">Cookie Policy</h1>
        <p>GymStack uses essential cookies for authentication and optional analytics cookies to improve product performance.</p>
        <h2 className="text-2xl font-semibold text-white">Essential cookies</h2>
        <p>Required for login sessions, secure routing, and API protection.</p>
        <h2 className="text-2xl font-semibold text-white">Preference controls</h2>
        <p>Cookie controls and consent management should be configured before production launch in each target region.</p>
      </main>
      <MarketingFooter />
    </div>
  );
}
