type TenantBillingProps = {
  params: { tenant: string };
};

export default function TenantBillingPage({ params }: TenantBillingProps) {
  return (
    <main>
      <h2 style={{ marginBottom: '0.5rem' }}>Billing</h2>
      <p style={{ color: '#475569' }}>
        Configure membership plans, invoices, and Stripe settings for
        {` ${params.tenant}`}.
      </p>
      <section style={{ marginTop: '1.5rem' }}>
        <h3>Next steps</h3>
        <ul>
          <li>Create at least one membership plan.</li>
          <li>Review upcoming subscription renewals.</li>
          <li>Sync payouts and tax settings.</li>
        </ul>
      </section>
    </main>
  );
}