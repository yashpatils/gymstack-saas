'use client';

import { Button } from '@/app/components/ui';

type OAuthButtonsProps = {
  returnTo: string;
  variant?: 'stacked' | 'inline';
};

const getOAuthStartUrl = (provider: 'google' | 'apple', returnTo: string): string => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
  const encodedReturnTo = encodeURIComponent(returnTo);
  return `${apiUrl}/api/auth/oauth/${provider}/start?returnTo=${encodedReturnTo}`;
};

export function OAuthButtons({ returnTo, variant = 'stacked' }: OAuthButtonsProps) {
  const containerClassName = variant === 'inline' ? 'flex flex-wrap gap-2' : 'space-y-2';

  return (
    <div className={containerClassName}>
      <Button type="button" onClick={() => { window.location.href = getOAuthStartUrl('google', returnTo); }}>
        Continue with Google
      </Button>
      <Button type="button" variant="secondary" onClick={() => { window.location.href = getOAuthStartUrl('apple', returnTo); }}>
        Continue with Apple
      </Button>
    </div>
  );
}

