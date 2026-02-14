export type OAuthPersona = 'OWNER' | 'MANAGER' | 'COACH' | 'STAFF' | 'CLIENT';

const isEnvFlagEnabled = (value: string | undefined): boolean => {
  if (value === undefined) {
    return true;
  }

  return value.toLowerCase() !== 'false';
};

const isGymLandingPath = (pathname: string): boolean => pathname.startsWith('/_sites/') || pathname.startsWith('/_custom/');

export const shouldShowOAuth = (params: { pathname: string; selectedPersona?: OAuthPersona | null }): boolean => {
  if (!isEnvFlagEnabled(process.env.NEXT_PUBLIC_ENABLE_OAUTH)) {
    return false;
  }

  if (isGymLandingPath(params.pathname)) {
    return true;
  }

  if (params.pathname === '/login' || params.pathname === '/signup') {
    return params.selectedPersona === 'MANAGER' || params.selectedPersona === 'COACH' || params.selectedPersona === 'STAFF' || params.selectedPersona === 'CLIENT';
  }

  return false;
};

