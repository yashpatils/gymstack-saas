type TenantHomeProps = {
  params: { tenant: string };
};

export default function TenantHomePage({ params }: TenantHomeProps) {
  return (
    <main>
      <h2 style={{ marginBottom: '0.5rem' }}>Welcome</h2>
      <p style={{ color: '#475569' }}>
        Choose a workspace module to manage {params.tenant}.
      </p>
      <ul style={{ marginTop: '1rem' }}>
        <li>Review membership health on the dashboard.</li>
        <li>Update trainers and member assignments.</li>
        <li>Manage plans and billing settings.</li>
      </ul>
    </main>
  );
}
