"use client";

type UpgradeModalProps = {
  open: boolean;
  title?: string;
  description?: string;
  errorCode?: string | null;
  onClose: () => void;
};

const plans = [
  { name: "Starter", price: "$49/mo", locations: 1, seats: 5, whiteLabel: "No" },
  { name: "Pro", price: "$149/mo", locations: 5, seats: 25, whiteLabel: "Yes" },
  { name: "Enterprise", price: "Custom", locations: "Custom", seats: "Custom", whiteLabel: "Yes" },
];

export function UpgradeModal({
  open,
  title = "Upgrade to unlock premium growth tools",
  description = "Get white-label branding, expansion controls, and premium analytics.",
  errorCode,
  onClose,
}: UpgradeModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-3xl rounded-2xl border border-white/20 bg-slate-950 p-6 text-white shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-slate-300">{description}</p>
            {errorCode ? <p className="mt-2 text-xs text-amber-300">Error code: {errorCode}</p> : null}
          </div>
          <button className="button secondary" onClick={onClose} type="button">Close</button>
        </div>
        <div className="mt-5 overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-slate-300">
              <tr>
                <th className="px-3 py-2">Plan</th>
                <th className="px-3 py-2">Price</th>
                <th className="px-3 py-2">Max locations</th>
                <th className="px-3 py-2">Staff seats</th>
                <th className="px-3 py-2">White-label</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan.name} className="border-t border-white/10">
                  <td className="px-3 py-2 font-medium">{plan.name}</td>
                  <td className="px-3 py-2">{plan.price}</td>
                  <td className="px-3 py-2">{plan.locations}</td>
                  <td className="px-3 py-2">{plan.seats}</td>
                  <td className="px-3 py-2">{plan.whiteLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-5 flex gap-3">
          <a className="button inline-flex" href="/platform/billing">Upgrade now</a>
          <a className="button secondary inline-flex" href="/contact">Contact sales</a>
        </div>
      </div>
    </div>
  );
}
