import { getMainSiteUrl } from '../../../src/lib/domainConfig';

const MAIN_SITE_PLATFORM = getMainSiteUrl('/platform');

export default function AdminAccessRestrictedPage({ searchParams }: { searchParams?: { requestId?: string } }) {
  const requestId = searchParams?.requestId;

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <section className="w-full max-w-lg rounded-3xl border border-white/15 bg-slate-900/75 p-8 text-center text-slate-100 shadow-2xl backdrop-blur">
        <h1 className="text-2xl font-semibold text-white">Access restricted</h1>
        <p className="mt-3 text-sm text-slate-300">You are authenticated, but this account is not allowlisted for the platform owner console.</p>
        {requestId ? <p className="mt-3 text-xs text-slate-400">Request ID: {requestId}</p> : null}
        <a href={MAIN_SITE_PLATFORM} className="mt-6 inline-block rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400">
          Go to platform
        </a>
      </section>
    </main>
  );
}
