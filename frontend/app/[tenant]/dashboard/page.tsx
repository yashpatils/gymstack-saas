"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const kpis = [
  {
    label: "Active members",
    value: "1,248",
    change: "+6.4%",
    note: "Retention trending upward this quarter.",
  },
  {
    label: "Monthly recurring revenue",
    value: "$84,120",
    change: "+4.1%",
    note: "Strength memberships and PT bundles.",
  },
  {
    label: "Class utilization",
    value: "86%",
    change: "+3.2%",
    note: "Evening cycles nearly at capacity.",
  },
  {
    label: "Trainer coverage",
    value: "92%",
    change: "+1.7%",
    note: "Two open shifts to fill next week.",
  },
];

const memberActivity = [
  { day: "Mon", checkins: 210, dropOff: 32 },
  { day: "Tue", checkins: 248, dropOff: 28 },
  { day: "Wed", checkins: 232, dropOff: 30 },
  { day: "Thu", checkins: 275, dropOff: 26 },
  { day: "Fri", checkins: 265, dropOff: 31 },
  { day: "Sat", checkins: 312, dropOff: 24 },
  { day: "Sun", checkins: 198, dropOff: 38 },
];

const revenueMix = [
  { name: "Memberships", value: 62 },
  { name: "Personal training", value: 21 },
  { name: "Retail", value: 9 },
  { name: "Corporate", value: 8 },
];

const attendanceTrends = [
  { week: "Wk 1", peak: 78, offPeak: 46 },
  { week: "Wk 2", peak: 82, offPeak: 52 },
  { week: "Wk 3", peak: 85, offPeak: 54 },
  { week: "Wk 4", peak: 88, offPeak: 57 },
];

const churnSignals = [
  { month: "Jan", risk: 18 },
  { month: "Feb", risk: 14 },
  { month: "Mar", risk: 12 },
  { month: "Apr", risk: 10 },
  { month: "May", risk: 9 },
  { month: "Jun", risk: 8 },
];

const pieColors = ["#a78bfa", "#60a5fa", "#fbbf24", "#34d399"];

const growthBars = [
  { label: "Mon", value: 48 },
  { label: "Tue", value: 62 },
  { label: "Wed", value: 70 },
  { label: "Thu", value: 54 },
  { label: "Fri", value: 86 },
  { label: "Sat", value: 78 },
  { label: "Sun", value: 58 },
];

const attendancePoints = [
  { label: "6am", value: 30, left: "6%" },
  { label: "8am", value: 58, left: "22%" },
  { label: "10am", value: 68, left: "38%" },
  { label: "12pm", value: 42, left: "54%" },
  { label: "4pm", value: 76, left: "70%" },
  { label: "7pm", value: 90, left: "86%" },
];

const segmentMix = [
  { label: "Memberships", value: 52 },
  { label: "PT", value: 28 },
  { label: "Retail", value: 12 },
  { label: "Corporate", value: 8 },
];

export default function TenantDashboardPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-10 text-slate-100">
      <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-[0_24px_60px_rgba(2,6,23,0.55)] md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-300">
            Gymstack HQ
          </p>
          <h1 className="text-3xl font-semibold text-white md:text-4xl">
            Tenant dashboard
          </h1>
          <p className="max-w-2xl text-sm text-slate-300 md:text-base">
            Monitor KPIs, attendance, and revenue signals across your gym in
            real time. Tailored insights help you keep trainers staffed and
            classes full.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="rounded-full bg-violet-500 px-5 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-violet-500/30">
            Create report
          </button>
          <button className="rounded-full border border-white/15 px-5 py-2 text-sm font-semibold text-slate-200">
            Invite staff
          </button>
        </div>
      </header>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <article
            key={kpi.label}
            className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.45)]"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  {kpi.label}
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {kpi.value}
                </p>
              </div>
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                {kpi.change}
              </span>
            </div>
            <p className="mt-3 text-sm text-slate-400">{kpi.note}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.45)]">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-white">Daily check-ins</h2>
              <p className="text-sm text-slate-400">
                Track member traffic and peak lobby flow.
              </p>
            </div>
            <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
              +12% week over week
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={memberActivity} margin={{ top: 10, right: 16, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="checkins" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="#1f2937" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "#0f172a",
                    border: "1px solid rgba(148,163,184,0.2)",
                    borderRadius: 12,
                  }}
                  itemStyle={{ color: "#e2e8f0" }}
                />
                <Area
                  type="monotone"
                  dataKey="checkins"
                  stroke="#a78bfa"
                  strokeWidth={2}
                  fill="url(#checkins)"
                />
                <Line
                  type="monotone"
                  dataKey="dropOff"
                  stroke="#38bdf8"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.45)]">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white">Revenue mix</h2>
            <p className="text-sm text-slate-400">
              Breakdown of recurring and add-on revenue streams.
            </p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  contentStyle={{
                    background: "#0f172a",
                    border: "1px solid rgba(148,163,184,0.2)",
                    borderRadius: 12,
                  }}
                  itemStyle={{ color: "#e2e8f0" }}
                />
                <Pie
                  data={revenueMix}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={6}
                >
                  {revenueMix.map((entry, index) => (
                    <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            {revenueMix.map((stream, index) => (
              <div key={stream.name} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-300">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: pieColors[index % pieColors.length] }}
                  />
                  {stream.name}
                </span>
                <span className="font-semibold text-slate-200">{stream.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.45)]">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white">Peak vs. off-peak usage</h2>
            <p className="text-sm text-slate-400">
              Weekly attendance split to optimize trainer coverage.
            </p>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceTrends} margin={{ top: 10, right: 16, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#1f2937" />
                <XAxis dataKey="week" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "#0f172a",
                    border: "1px solid rgba(148,163,184,0.2)",
                    borderRadius: 12,
                  }}
                  itemStyle={{ color: "#e2e8f0" }}
                />
                <Bar dataKey="peak" fill="#a78bfa" radius={[6, 6, 0, 0]} />
                <Bar dataKey="offPeak" fill="#38bdf8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.45)]">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white">Churn risk signals</h2>
            <p className="text-sm text-slate-400">
              Members tagged for re-engagement campaigns.
            </p>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={churnSignals} margin={{ top: 10, right: 16, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#1f2937" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "#0f172a",
                    border: "1px solid rgba(148,163,184,0.2)",
                    borderRadius: 12,
                  }}
                  itemStyle={{ color: "#e2e8f0" }}
                />
                <Line type="monotone" dataKey="risk" stroke="#facc15" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 rounded-2xl border border-dashed border-amber-400/40 bg-amber-400/10 p-4 text-sm text-amber-200">
            18 members need follow-up this week. Launch the win-back playbook to
            reduce churn.
          </div>
        </div>
      </section>
    </main>
  );
}
