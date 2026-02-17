"use client";

type UpgradeModalProps = {
  open: boolean;
  title?: string;
  description?: string;
  onClose: () => void;
};

const plans = [
  { name: 'Starter', price: '$49/mo', bullets: ['1 location', 'Core operations', 'Basic support'] },
  { name: 'Pro', price: '$149/mo', bullets: ['Multi-location growth', 'White-label branding', 'Priority support'] },
];

export function UpgradeModal({
  open,
  title = 'Upgrade to unlock premium growth tools',
  description = 'Get white-label branding, expansion controls, and premium analytics.',
  onClose,
}: UpgradeModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-2xl rounded-2xl border border-white/20 bg-slate-950 p-6 text-white shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-slate-300">{description}</p>
          </div>
          <button className="button secondary" onClick={onClose} type="button">Close</button>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {plans.map((plan) => (
            <article key={plan.name} className={`rounded-xl border p-4 ${plan.name === 'Pro' ? 'border-indigo-400/60 bg-indigo-500/10' : 'border-white/10 bg-white/5'}`}>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{plan.name}</p>
              <p className="mt-2 text-2xl font-semibold">{plan.price}</p>
              <ul className="mt-3 space-y-1 text-sm text-slate-300">
                {plan.bullets.map((bullet) => <li key={bullet}>• {bullet}</li>)}
              </ul>
            </article>
          ))}
        </div>
        <a className="button mt-5 inline-flex" href="/platform/billing">Upgrade now</a>
      </div>
    </div>
  );
}
