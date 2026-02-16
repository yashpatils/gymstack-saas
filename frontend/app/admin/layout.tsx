import { redirect } from 'next/navigation';
import { getAdminSession } from './_lib/server-admin-api';

const MAIN_SITE_LOGIN = 'https://gymstack.club/login';

export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();

  if (!session.isAuthenticated) {
    redirect('/login?next=/admin');
  }

  if (!session.isPlatformAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <section className="w-full max-w-lg rounded-3xl border border-white/15 bg-slate-900/75 p-8 text-center text-slate-100 shadow-2xl backdrop-blur">
          <h1 className="text-2xl font-semibold text-white">Access restricted: Gym Stack admins only</h1>
          <p className="mt-3 text-sm text-slate-300">Your account is signed in, but it is not allowed to access the Gym Stack admin console.</p>
          <a href={MAIN_SITE_LOGIN} className="mt-6 inline-block rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400">
            Go to member login
          </a>
        </section>
      </main>
    );
  }

  return children;
}
