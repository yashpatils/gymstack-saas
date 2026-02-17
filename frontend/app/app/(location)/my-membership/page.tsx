export default function MyMembershipPage() {
  return (
    <section>
      <h2 className="text-2xl font-semibold">My Membership</h2>
      <p className="mt-1 text-sm text-slate-300">Membership details endpoint will be connected in v1.1.</p>
      <div className="mt-6 rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-500/10 to-indigo-500/10 p-6">
        <p className="text-sm text-slate-200">Plan: <span className="font-semibold">Active (placeholder)</span></p>
        <p className="mt-2 text-xs text-slate-400">Perks, billing cycle, and package utilization will show here.</p>
      </div>
    </section>
  );
}
