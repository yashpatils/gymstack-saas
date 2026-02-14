import { OAuthProvider } from '@prisma/client';

export type OAuthProfile = {
  subject: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  avatar: string | null;
};

export type OAuthRequestedMode = 'login' | 'link';

export type OAuthFinalizeResult = {
  accessToken: string;
  returnTo: string;
  linked: boolean;
  userId: string;
};

export type OAuthProviderName = OAuthProvider;
