"use client";

import { FormEvent, useState } from "react";
import { MarketingFooter, MarketingNavbar } from "../components/marketing-chrome";
import { buildApiUrl } from "../../src/lib/apiFetch";

type SupportTicketResponse = {
  ok: boolean;
  ticketId: string;
};

export function ContactClient() {
  const [message, setMessage] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const payload = {
      email: String(formData.get("email") ?? ""),
      subject: String(formData.get("subject") ?? ""),
      message: String(formData.get("message") ?? ""),
    };

    try {
      const response = await fetch(buildApiUrl("/support/ticket"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setMessage("Unable to submit your message right now. Please email support@gymstack.club.");
        return;
      }

      const result = (await response.json()) as SupportTicketResponse;
      setMessage(`Thanks! Support ticket ${result.ticketId.slice(0, 8)} has been created.`);
      event.currentTarget.reset();
    } catch {
      setMessage("Network issue submitting ticket. Please email support@gymstack.club.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen">
      <MarketingNavbar />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-16">
        <section className="space-y-3 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Contact</p>
          <h1 className="text-4xl font-semibold text-white">Book a demo or contact support.</h1>
        </section>

        <form className="space-y-4 rounded-3xl border border-white/10 bg-slate-900/70 p-8" onSubmit={(event) => void handleSubmit(event)}>
          <input name="email" type="email" className="input" placeholder="Work email" required />
          <input name="subject" type="text" className="input" placeholder="Subject" required />
          <textarea name="message" className="input min-h-36" placeholder="How can we help?" required />
          <div className="flex flex-wrap gap-3">
            <button type="submit" className="button" disabled={submitting}>{submitting ? "Submitting..." : "Send message"}</button>
            <a href="mailto:sales@gymstack.club" className="button secondary">Book a demo</a>
          </div>
          {message ? <p className="text-sm text-slate-300">{message}</p> : null}
        </form>
      </main>
      <MarketingFooter />
    </div>
  );
}
