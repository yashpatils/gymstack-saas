import Link from 'next/link';

export default function AdminOpsLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <nav className="mb-6 flex gap-3 text-sm">
        <Link href="/admin/ops/backups" className="text-cyan-300">Backups</Link>
        <Link href="/admin/ops/migrations" className="text-cyan-300">Migrations</Link>
      </nav>
      {children}
    </main>
  );
}
