type TenantMembersProps = {
  params: { tenant: string };
};

export default function TenantMembersPage({ params }: TenantMembersProps) {
  return (
    <main>
      <h2 style={{ marginBottom: '0.5rem' }}>Members</h2>
      <p style={{ color: '#475569' }}>
        Track memberships, onboarding, and health goals for {params.tenant}.
      </p>
      <section style={{ marginTop: '1.5rem' }}>
        <h3>Member actions</h3>
        <ul>
          <li>Invite new members or upload a CSV roster.</li>
          <li>Assign workout and meal plans to active subscriptions.</li>
          <li>Review members flagged as at-risk.</li>
        </ul>
      </section>
    </main>
  );
}
