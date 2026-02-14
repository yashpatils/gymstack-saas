'use client';

import { oauthStartUrl } from '@/src/lib/auth';

type OAuthButtonsProps = {
  returnTo: string;
  inviteToken?: string;
  variant?: 'stacked' | 'inline';
};

export function OAuthButtons({ returnTo, inviteToken, variant = 'stacked' }: OAuthButtonsProps) {
  const containerClassName = variant === 'inline' ? 'flex flex-wrap gap-2' : 'space-y-2';

  return (
    <div className={containerClassName}>
      <button
        type="button"
        className="inline-flex h-11 w-full items-center justify-center gap-3 rounded-md border border-[#dadce0] bg-white px-4 text-sm font-medium text-[#3c4043] transition hover:bg-[#f8f9fa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a73e8] focus-visible:ring-offset-2"
        onClick={() => {
          window.location.href = oauthStartUrl('google', 'login', { returnTo, inviteToken });
        }}
        aria-label="Sign in with Google"
      >
        <GoogleIcon />
        <span>Sign in with Google</span>
      </button>
      <button
        type="button"
        className="inline-flex h-11 w-full items-center justify-center gap-3 rounded-md border border-white/20 bg-black px-4 text-sm font-medium text-white transition hover:bg-[#1f1f1f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2"
        onClick={() => {
          window.location.href = oauthStartUrl('apple', 'login', { returnTo, inviteToken });
        }}
        aria-label="Sign in with Apple"
      >
        <AppleIcon />
        <span>Sign in with Apple</span>
      </button>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#EA4335" d="M9 7.36v3.48h4.84c-.2 1.12-.85 2.07-1.82 2.71l2.94 2.28c1.71-1.58 2.7-3.9 2.7-6.65 0-.63-.06-1.24-.16-1.82H9Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.17l-2.94-2.28c-.8.54-1.83.86-3.02.86-2.32 0-4.29-1.57-5-3.68l-3.04 2.34C2.44 16.02 5.47 18 9 18Z" />
      <path fill="#4A90E2" d="M4 10.73c-.17-.54-.27-1.11-.27-1.73s.1-1.19.27-1.73L.96 4.93A9.05 9.05 0 0 0 0 9c0 1.45.35 2.82.96 4.07L4 10.73Z" />
      <path fill="#FBBC05" d="M9 3.58c1.32 0 2.5.45 3.44 1.34l2.58-2.58C13.47.89 11.43 0 9 0 5.47 0 2.44 1.98.96 4.93L4 7.27c.71-2.11 2.68-3.69 5-3.69Z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.13 12.95c.02 2.6 2.27 3.47 2.29 3.49-.02.06-.36 1.24-1.2 2.45-.72 1.04-1.46 2.07-2.64 2.09-1.15.02-1.52-.68-2.84-.68-1.31 0-1.73.66-2.81.7-1.13.04-2-.11-2.87-1.16-.87-1.06-1.55-2.98-1.55-4.86 0-3.18 2.07-4.86 4.08-4.89 1.08-.02 2.09.72 2.8.72.71 0 2.03-.89 3.42-.76.58.02 2.2.23 3.24 1.75-.08.05-1.93 1.13-1.91 3.35Zm-2.32-6.52c.58-.71.98-1.69.87-2.68-.83.03-1.84.55-2.44 1.26-.54.63-1.02 1.64-.89 2.6.92.07 1.87-.47 2.46-1.18Z" />
    </svg>
  );
}
