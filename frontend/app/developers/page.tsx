export default function DevelopersDocsPage() {
  return (
    <main className="page space-y-4">
      <h1 className="text-2xl font-semibold">GymStack Public API</h1>
      <p>Base URL: <code>/api/public/v1</code></p>
      <p>Authentication: <code>Authorization: Bearer &lt;api_key&gt;</code></p>
      <pre className="card overflow-auto text-xs">{`GET /api/public/v1/locations\nGET /api/public/v1/members\nGET /api/public/v1/classes\nGET /api/public/v1/schedule\nPOST /api/public/v1/bookings\n{ "sessionId": "...", "memberEmail": "..." }`}</pre>
    </main>
  );
}
