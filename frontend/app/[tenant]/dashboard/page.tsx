type TenantDashboardProps = {
  params: { tenant: string };
};

export default function TenantDashboardPage({ params }: TenantDashboardProps) {
  return (
    <main>
      <h2 style={{ marginBottom: '0.5rem' }}>Dashboard</h2>
      <p style={{ color: '#475569' }}>
        Quick snapshot of {params.tenant} activity, upcoming renewals, and staff
        coverage.
      </p>
      <div style={{ display: 'grid', gap: '1rem', marginTop: '1.5rem' }}>
        <section style={{ border: '1px solid #e2e8f0', padding: '1rem' }}>
          <h3>Membership health</h3>
          <ul>
            <li>Active members: 248</li>
            <li>Renewals due this week: 18</li>
            <li>At-risk members: 9</li>
          </ul>
        </section>
        <section style={{ border: '1px solid #e2e8f0', padding: '1rem' }}>
          <h3>Trainer coverage</h3>
          <ul>
            <li>Sessions scheduled today: 34</li>
            <li>Open trainer slots: 6</li>
            <li>Awaiting assignment: 4 members</li>
          </ul>
        </section>
      </div>
    </main>
  );
}