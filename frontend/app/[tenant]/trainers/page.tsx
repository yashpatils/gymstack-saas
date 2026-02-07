type TenantTrainersProps = {
  params: { tenant: string };
};

export default function TenantTrainersPage({ params }: TenantTrainersProps) {
  return (
    <main>
      <h2 style={{ marginBottom: '0.5rem' }}>Trainers</h2>
      <p style={{ color: '#475569' }}>
        Manage {params.tenant} trainers, specialties, and member assignments.
      </p>
      <section style={{ marginTop: '1.5rem' }}>
        <h3>Coverage checklist</h3>
        <ul>
          <li>Pending certifications to verify.</li>
          <li>Upcoming schedule gaps.</li>
          <li>Members without assigned trainers.</li>
        </ul>
      </section>
    </main>
  );
}
