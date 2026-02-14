'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/providers/AuthProvider';
import { Alert, Button, Input } from './ui';
import { oauthStartUrl } from '@/src/lib/auth';

export function GymLoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="w-full max-w-md space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        try {
          await login(email, password);
          router.push('/platform');
        } catch (submitError) {
          setError(submitError instanceof Error ? submitError.message : 'Unable to login');
        }
      }}
    >
      <h1 className="text-2xl font-semibold text-white">Gym login</h1>
      {error ? <Alert>{error}</Alert> : null}
      <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      <Input label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
      <Button type="submit">Sign in</Button>

      <div className="space-y-2">
        <Button type="button" onClick={() => { window.location.href = oauthStartUrl('google', 'login'); }}>
          Continue with Google
        </Button>
        <Button type="button" variant="secondary" onClick={() => { window.location.href = oauthStartUrl('apple', 'login'); }}>
          Continue with Apple
        </Button>
      </div>

    </form>
  );
}
