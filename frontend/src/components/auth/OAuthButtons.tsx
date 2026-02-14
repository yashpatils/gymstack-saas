'use client';

import { Button } from '@/app/components/ui';
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
      <Button type="button" onClick={() => { window.location.href = oauthStartUrl('google', 'login', { returnTo, inviteToken }); }}>
        Continue with Google
      </Button>
      <Button type="button" variant="secondary" onClick={() => { window.location.href = oauthStartUrl('apple', 'login', { returnTo, inviteToken }); }}>
        Continue with Apple
      </Button>
    </div>
  );
}
