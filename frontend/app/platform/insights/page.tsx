"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiFetch, ApiFetchError } from "../../../src/lib/apiFetch";
import { EmptyState } from "../../../src/components/common/EmptyState";

type Insight = {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  summary: string;
  recommendedActions: string[];
  metricRefs: string[];
  createdAt: string;
  locationId: string | null;
};

type AskResponse = {
  answer: string;
  data: Record<string, unknown>;
  citations: string[];
};

const suggestedPrompts = [
  "How was attendance this week vs last?",
  "Which classes are most popular?",
  "Are cancellations increasing?",
];

export default function PlatformInsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [locationId, setLocationId] = useState<string>("");
  const [aiEnabled, setAiEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState<Array<{ role: "user" | "assistant"; content: string; data?: Record<string, unknown>; citations?: string[] }>>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const flags = await apiFetch<Record<string, boolean>>("/feature-flags");
        if (!mounted) return;
        const enabled = flags.ai_analytics === true;
        setAiEnabled(enabled);

        const history = await apiFetch<Insight[]>(`/platform/insights${locationId ? `?locationId=${locationId}` : ""}`);
        if (mounted) {
          setInsights(history);
        }
      } catch {
        if (mounted) {
          setInsights([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [locationId]);

  const filtered = useMemo(() => (locationId ? insights.filter((item) => item.locationId === locationId) : insights), [insights, locationId]);

  const generateInsights = async () => {
    try {
      const generated = await apiFetch<Insight[]>("/platform/insights/generate", {
        method: "POST",
        body: { locationId: locationId || undefined },
      });
      setInsights(generated);
    } catch {
      setInsights([]);
    }
  };

  const ask = async (input: string) => {
    if (!aiEnabled) {
      return;
    }

    setChat((prev) => [...prev, { role: "user", content: input }]);
    try {
      const answer = await apiFetch<AskResponse>("/ai/ask", {
        method: "POST",
        body: {
          question: input,
          scope: locationId ? "LOCATION" : "TENANT",
          locationId: locationId || undefined,
        },
      });
      setChat((prev) => [...prev, { role: "assistant", content: answer.answer, data: answer.data, citations: answer.citations }]);
    } catch (error) {
      const message = error instanceof ApiFetchError ? error.message : "Unable to process question";
      setChat((prev) => [...prev, { role: "assistant", content: message }]);
    }
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!question.trim()) return;
    void ask(question.trim());
    setQuestion("");
  };

  return (
    <main className="container-app py-8 space-y-6">
      <section className="card space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="section-title">AI Insights</h1>
            <p className="text-sm text-slate-300">Daily and weekly operational signals with recommended actions.</p>
          </div>
          <button className="button" onClick={() => { void generateInsights(); }} type="button">Generate latest insights</button>
        </div>
        <label className="text-sm text-slate-300">Location filter
          <input className="input mt-2" value={locationId} onChange={(event) => setLocationId(event.target.value)} placeholder="Optional location UUID" />
        </label>
      </section>

      <section className="grid gap-4">
        {loading ? <p className="text-sm text-slate-400">Loading insights…</p> : null}
        {!loading && filtered.length === 0 ? <EmptyState title="No insights yet" description="Generate insights to see attendance, churn, and utilization trends." /> : null}
        {filtered.map((insight) => (
          <article key={insight.id} className="card space-y-3 transition-transform duration-200 hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white">{insight.title}</h2>
              <span className={`rounded-full px-2 py-1 text-xs uppercase ${insight.severity === "critical" ? "bg-rose-500/20 text-rose-200" : insight.severity === "warning" ? "bg-amber-500/20 text-amber-200" : "bg-sky-500/20 text-sky-200"}`}>
                {insight.severity}
              </span>
            </div>
            <p className="text-sm text-slate-300">{insight.summary}</p>
            <div>
              <h3 className="text-xs uppercase tracking-wide text-slate-400">Recommended actions</h3>
              <ul className="mt-1 list-disc pl-5 text-sm text-slate-200">
                {insight.recommendedActions.map((action) => <li key={action}>{action}</li>)}
              </ul>
            </div>
          </article>
        ))}
      </section>

      <section className="card space-y-4">
        <h2 className="section-title">Ask GymStack</h2>
        {!aiEnabled ? <p className="text-sm text-slate-400">AI analytics is disabled. Enable the <code>ai_analytics</code> feature flag and <code>AI_ANALYTICS_ENABLED=true</code>.</p> : null}
        {aiEnabled ? (
          <>
            <div className="flex flex-wrap gap-2">
              {suggestedPrompts.map((prompt) => (
                <button key={prompt} type="button" className="button secondary" onClick={() => { void ask(prompt); }}>{prompt}</button>
              ))}
            </div>
            <div className="space-y-3 rounded-xl border border-white/10 bg-slate-950/50 p-4">
              {chat.map((message, index) => (
                <div key={`${message.role}-${index}`} className={message.role === "assistant" ? "text-slate-200" : "text-indigo-200"}>
                  <p className="text-sm">{message.content}</p>
                  {message.data ? <pre className="mt-2 overflow-x-auto rounded bg-black/30 p-2 text-xs">{JSON.stringify(message.data, null, 2)}</pre> : null}
                </div>
              ))}
            </div>
            <form onSubmit={onSubmit} className="flex gap-2">
              <input className="input" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about attendance, top classes, churn, no-show rate..." />
              <button className="button" type="submit">Send</button>
            </form>
          </>
        ) : null}
      </section>
    </main>
  );
}
