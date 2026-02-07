"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
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

const kpiCards = [
  {
    label: "Active members",
    value: "1,248",
    change: "+6.2%",
    detail: "Lifted by spring onboarding campaign.",
  },
  {
    label: "Monthly revenue",
    value: "$84,120",
    change: "+4.8%",
    detail: "Strong retention on premium plans.",
  },
  {
    label: "Trainer coverage",
    value: "92%",
    change: "+3.1%",
    detail: "New shift overlaps eliminated gaps.",
  },
  {
    label: "Avg. class fill",
    value: "78%",
    change: "-1.4%",
    detail: "Evening HIIT sessions need attention.",
  },
];

const membershipTrend = [
  { month: "Jan", members: 980, signups: 120 },
  { month: "Feb", members: 1020, signups: 135 },
  { month: "Mar", members: 1115, signups: 160 },
  { month: "Apr", members: 1180, signups: 172 },
  { month: "May", members: 1248, signups: 188 },
  { month: "Jun", members: 1290, signups: 210 },
];

const revenueMix = [
  { name: "Memberships", value: 58, color: "#8b5cf6" },
  { name: "Personal training", value: 26, color: "#38bdf8" },
  { name: "Retail", value: 16, color: "#22c55e" },
];

const attendanceHeatmap = [
  { hour: "6a", checkins: 40 },
  { hour: "8a", checkins: 68 },
  { hour: "10a", checkins: 52 },
  { hour: "12p", checkins: 80 },
  { hour: "2p", checkins: 60 },
  { hour: "4p", checkins: 74 },
  { hour: "6p", checkins: 110 },
  { hour: "8p", checkins: 86 },
];

const classRevenue = [
  { class: "Strength", revenue: 18200 },
  { class: "HIIT", revenue: 14600 },
  { class: "Cycling", revenue: 13250 },
  { class: "Yoga", revenue: 11600 },
];

const schedule = [
  {
    title: "Powerlifting fundamentals",
    trainer: "Marcus Reed",
    time: "7:30 AM",
    location: "Studio A",
  },
  {
    title: "Athlete recovery flow",
    trainer: "Sofia Brooks",
    time: "12:15 PM",
    location: "Studio C",
  },
  {
    title: "Performance HIIT",
    trainer: "Priya Shah",
    time: "6:00 PM",
    location: "Main floor",
  },
];

export default function TenantDashboardPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 pb-20 pt-10 text-slate-100">
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-violet-300">
            Gymstack overview
          </p>
          <h1 className="text-3xl font-semibold text-white sm:text-4xl">
            Tenant performance dashboard
          </h1>
          <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
            KPI highlights, revenue mix, and attendance rhythms for today&apos;s
            operations. Drill into the charts to spot gaps before they impact member
            experience.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="rounded-full border border-slate-700/60 bg-slate-900/70 px-4 py-2 text-sm font-semibold text-slate-200 shadow-lg shadow-violet-500/10 transition hover:border-violet-400/60 hover:text-white">
            Export report
          </button>
          <button className="rounded-full bg-violet-500 px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-violet-500/30 transition hover:bg-violet-400">
            Invite staff
          </button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-xl shadow-slate-950/40 backdrop-blur"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                {kpi.label}
              </p>
              <span
                className={`rounded-full px-2 py-1 text-xs font-semibold ${
                  kpi.change.startsWith("-")
                    ? "bg-rose-500/10 text-rose-300"
                    : "bg-emerald-500/10 text-emerald-300"
                }`}
              >
                {kpi.change}
              </span>
            </div>
            <p className="mt-3 text-2xl font-semibold text-white">{kpi.value}</p>
            <p className="mt-2 text-sm text-slate-400">{kpi.detail}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/40">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Member momentum</h2>
              <p className="text-sm text-slate-400">
                Active member count and new signups over the last six months.
              </p>
            </div>
            <div className="rounded-full border border-slate-700/70 px-3 py-1 text-xs text-slate-300">
              Updated 5 minutes ago
            </div>
          </div>
          <div className="mt-6 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={membershipTrend}>
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    background: "#0f172a",
                    borderRadius: 12,
                    border: "1px solid rgba(148, 163, 184, 0.2)",
                    color: "#e2e8f0",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="members"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="signups"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/40">
          <h2 className="text-lg font-semibold text-white">Revenue mix</h2>
          <p className="text-sm text-slate-400">
            Distribution of revenue streams this month.
          </p>
          <div className="mt-6 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={revenueMix}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                >
                  {revenueMix.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#0f172a",
                    borderRadius: 12,
                    border: "1px solid rgba(148, 163, 184, 0.2)",
                    color: "#e2e8f0",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            {revenueMix.map((entry) => (
              <li key={entry.name} className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  {entry.name}
                </span>
                <span className="font-semibold text-white">{entry.value}%</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/40">
          <h2 className="text-lg font-semibold text-white">Peak check-in times</h2>
          <p className="text-sm text-slate-400">
            Attendance rhythm across the day to optimize staffing.
          </p>
          <div className="mt-6 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={attendanceHeatmap}>
                <XAxis dataKey="hour" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    background: "#0f172a",
                    borderRadius: 12,
                    border: "1px solid rgba(148, 163, 184, 0.2)",
                    color: "#e2e8f0",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="checkins"
                  stroke="#22d3ee"
                  fill="rgba(34, 211, 238, 0.25)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/40">
          <h2 className="text-lg font-semibold text-white">Class revenue</h2>
          <p className="text-sm text-slate-400">
            Top earning classes based on attendance and upsells.
          </p>
          <div className="mt-6 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classRevenue}>
                <XAxis dataKey="class" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    background: "#0f172a",
                    borderRadius: 12,
                    border: "1px solid rgba(148, 163, 184, 0.2)",
                    color: "#e2e8f0",
                  }}
                />
                <Bar dataKey="revenue" fill="#f97316" radius={[12, 12, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-950/80 p-6 shadow-xl shadow-slate-950/40">
          <h2 className="text-lg font-semibold text-white">Today&apos;s priority sessions</h2>
          <p className="text-sm text-slate-400">
            Instructor lineup with recommended focus areas.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {schedule.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-white/10 bg-slate-950/70 p-4"
              >
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <p className="mt-2 text-xs text-slate-400">{item.trainer}</p>
                <div className="mt-4 flex items-center justify-between text-xs text-slate-300">
                  <span>{item.time}</span>
                  <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-emerald-200">
                    {item.location}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/40">
          <h2 className="text-lg font-semibold text-white">Ops alerts</h2>
          <p className="text-sm text-slate-400">
            Tasks needing attention before peak hours.
          </p>
          <div className="mt-4 space-y-3 text-sm text-slate-300">
            <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-3">
              <p className="font-semibold text-amber-200">5 expiring cards</p>
              <p className="text-xs text-amber-100/80">
                Auto-renewal flow needs follow-up calls.
              </p>
            </div>
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3">
              <p className="font-semibold text-emerald-200">Front desk coverage</p>
              <p className="text-xs text-emerald-100/80">
                All shifts staffed after 4 PM.
              </p>
            </div>
            <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-3">
              <p className="font-semibold text-rose-200">2 waivers missing</p>
              <p className="text-xs text-rose-100/80">
                Members arriving at 6 PM need signatures.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
