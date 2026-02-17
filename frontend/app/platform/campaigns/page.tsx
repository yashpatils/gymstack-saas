"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../src/lib/apiFetch";

type SegmentType = "INACTIVE_MEMBERS" | "EXPIRING_MEMBERSHIPS" | "LOW_ATTENDANCE_MEMBERS";

type CampaignDraft = { id: string; segmentType: SegmentType; subject: string; body: string; recipientCount: number; createdAt: string };
type CampaignHistory = { id: string; segmentType: SegmentType; subject: string; recipientCount: number; sentAt: string | null; createdAt: string };

const segmentOptions: Array<{ value: SegmentType; label: string }> = [
  { value: "INACTIVE_MEMBERS", label: "Inactive members" },
  { value: "EXPIRING_MEMBERSHIPS", label: "Expiring memberships" },
  { value: "LOW_ATTENDANCE_MEMBERS", label: "Low attendance members" },
];

export default function PlatformCampaignsPage() {
  const [segmentType, setSegmentType] = useState<SegmentType>("INACTIVE_MEMBERS");
  const [draft, setDraft] = useState<CampaignDraft | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [history, setHistory] = useState<CampaignHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const segmentLabel = useMemo(() => segmentOptions.find((option) => option.value === segmentType)?.label ?? segmentType, [segmentType]);

  const loadHistory = async () => setHistory(await apiFetch<CampaignHistory[]>("/api/campaigns"));
  useEffect(() => { void loadHistory(); }, []);

  const generate = async () => {
    setLoading(true); setMessage("");
    try {
      const generated = await apiFetch<CampaignDraft>("/api/campaigns/generate", { method: "POST", body: { segmentType } });
      setDraft(generated); setSubject(generated.subject); setBody(generated.body);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to generate draft");
    } finally { setLoading(false); }
  };

  const send = async () => {
    if (!draft) return;
    if (!window.confirm(`Send this campaign to ${draft.recipientCount} members?`)) return;
    setLoading(true); setMessage("");
    try {
      await apiFetch<{ campaignId: string }>("/api/campaigns/send", { method: "POST", body: { draftId: draft.id, segmentType, subject, body } });
      setMessage("Campaign queued successfully.");
      await loadHistory();
      setDraft(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to send campaign");
    } finally { setLoading(false); }
  };

  return <main className="container-app py-8 space-y-6"><section className="card space-y-4"><h1 className="section-title">AI Reactivation Campaigns</h1><p className="text-sm text-slate-300">Generate and send recovery campaigns in one click.</p><label className="text-sm text-slate-300">Segment<select className="input mt-2" value={segmentType} onChange={(event) => setSegmentType(event.target.value as SegmentType)}>{segmentOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><button className="button" type="button" onClick={() => { void generate(); }} disabled={loading}>{loading ? "Generating..." : `Preview ${segmentLabel} campaign`}</button>{draft ? <div className="space-y-3 rounded-xl border border-white/10 p-4"><p className="text-sm text-slate-300">Audience size: <strong className="text-white">{draft.recipientCount}</strong></p><label className="text-sm text-slate-300">Subject<input className="input mt-2" value={subject} onChange={(event) => setSubject(event.target.value)} /></label><label className="text-sm text-slate-300">Message<textarea className="input mt-2 min-h-40" value={body} onChange={(event) => setBody(event.target.value)} /></label><button className="button" type="button" onClick={() => { void send(); }} disabled={loading || draft.recipientCount === 0}>✨ Confirm and send campaign</button></div> : null}{message ? <p className="text-sm text-slate-200">{message}</p> : null}</section><section className="card space-y-3"><h2 className="section-title">Campaign history</h2><div className="space-y-2 text-sm text-slate-300">{history.map((item) => <div key={item.id} className="rounded border border-white/10 p-3"><p className="font-medium text-white">{item.subject}</p><p>{item.segmentType} • Recipients: {item.recipientCount}</p><p>{item.sentAt ? `Sent at ${new Date(item.sentAt).toLocaleString()}` : "Draft"}</p></div>)}{history.length === 0 ? <p>No campaigns yet.</p> : null}</div></section></main>;
}
