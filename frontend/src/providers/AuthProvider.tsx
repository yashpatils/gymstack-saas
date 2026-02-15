'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  type ActiveContext,
  type AuthMeResponse,
  type AuthUser,
  acceptInvite as acceptInviteRequest,
  getToken,
  login as loginRequest,
  logout as clearToken,
  me as getMe,
  setContext as setContextRequest,
  setMode as setModeRequest,
  signup as signupRequest,
  type SignupRole,
} from '../lib/auth';
import type { Membership, MembershipRole, OnboardingState, OwnerOperatorSettings } from '../types/auth';
import { setStoredPlatformRole, setSupportModeContext } from '../lib/supportMode';
import { ApiFetchError } from '../lib/apiFetch';
import { clearStoredActiveContext, setStoredActiveContext } from '../lib/auth/contextStore';

export type AuthIssue = 'SESSION_EXPIRED' | 'INSUFFICIENT_PERMISSIONS' | null;

type AuthContextValue = {
  user: AuthUser | null;
  role: string | null;
  token: string | null;
  loading: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  meStatus: 200 | 401 | 403 | null;
  authIssue: AuthIssue;
  memberships: Membership[];
  platformRole?: 'PLATFORM_ADMIN' | null;
  permissions: string[];
  activeContext?: ActiveContext;
  effectiveRole?: MembershipRole;
  activeMode?: 'OWNER' | 'MANAGER';
  onboarding?: OnboardingState;
  ownerOperatorSettings?: OwnerOperatorSettings | null;
  login: (email: string, password: string) => Promise<{ user: AuthUser; memberships: Membership[]; activeContext?: ActiveContext }>;
  signup: (email: string, password: string, role?: SignupRole) => Promise<{ user: AuthUser; memberships: Membership[]; activeContext?: ActiveContext; emailDeliveryWarning?: string }>;
  acceptInvite: (input: { token: string; password?: string; email?: string; name?: string }) => Promise<{ user: AuthUser; memberships: Membership[]; activeContext?: ActiveContext }>;
  chooseContext: (tenantId: string, gymId?: string) => Promise<void>;
  switchMode: (tenantId: string, mode: 'OWNER' | 'MANAGER', locationId?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<AuthUser | null>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [platformRole, setPlatformRole] = useState<'PLATFORM_ADMIN' | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [activeContext, setActiveContext] = useState<ActiveContext | undefined>(undefined);
  const [effectiveRole, setEffectiveRole] = useState<MembershipRole | undefined>(undefined);
  const [activeMode, setActiveMode] = useState<'OWNER' | 'MANAGER' | undefined>(undefined);
  const [onboarding, setOnboarding] = useState<OnboardingState | undefined>(undefined);
  const [ownerOperatorSettings, setOwnerOperatorSettings] = useState<OwnerOperatorSettings | null | undefined>(undefined);
  const [meStatus, setMeStatus] = useState<200 | 401 | 403 | null>(null);
  const [authIssue, setAuthIssue] = useState<AuthIssue>(null);

  const clearAuthState = useCallback(() => {
    setUser(null);
    setToken(null);
    setMemberships([]);
    setPlatformRole(null);
    setStoredPlatformRole(null);
    setSupportModeContext(null);
    clearStoredActiveContext();
    setPermissions([]);
    setActiveContext(undefined);
    setEffectiveRole(undefined);
    setActiveMode(undefined);
    setOnboarding(undefined);
    setOwnerOperatorSettings(undefined);
  }, []);

  const applyMeResponse = useCallback((meResponse: AuthMeResponse) => {
    setMeStatus(200);
    setAuthIssue(null);
    setUser(meResponse.user);
    setMemberships(meResponse.memberships ?? []);
    setPlatformRole(meResponse.platformRole ?? null);
    setStoredPlatformRole(meResponse.platformRole ?? null);
    if (meResponse.platformRole !== 'PLATFORM_ADMIN') {
      setSupportModeContext(null);
    }
    setPermissions(meResponse.permissions ?? []);
    setActiveContext(meResponse.activeContext);
    setStoredActiveContext(meResponse.activeContext);
    setEffectiveRole(meResponse.effectiveRole);
    setActiveMode(meResponse.activeMode);
    setOnboarding(meResponse.onboarding);
    setOwnerOperatorSettings(meResponse.ownerOperatorSettings);
  }, []);

  const hydrateFromMe = useCallback(async () => {
    try {
      const meResponse = await getMe();
      applyMeResponse(meResponse);
      return meResponse;
    } catch (error) {
      if (error instanceof ApiFetchError) {
        if (error.statusCode === 401) {
          setMeStatus(401);
          setAuthIssue('SESSION_EXPIRED');
        } else if (error.statusCode === 403) {
          setMeStatus(403);
          setAuthIssue('INSUFFICIENT_PERMISSIONS');
        }
      }
      throw error;
    }
  }, [applyMeResponse]);

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      const existingToken = getToken();
      if (!isMounted) return;

      setToken(existingToken);
      if (!existingToken) {
        clearAuthState();
        setMeStatus(null);
        setAuthIssue(null);
        setIsLoading(false);
        return;
      }

      try {
        await hydrateFromMe();
      } catch (error) {
        if (error instanceof ApiFetchError && error.statusCode === 403) {
          if (isMounted) {
            setUser(null);
            setMemberships([]);
          }
        } else {
          if (isMounted) {
            clearAuthState();
          }
          clearToken();
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadUser();

    return () => {
      isMounted = false;
    };
  }, [clearAuthState, hydrateFromMe]);

  const login = useCallback(async (email: string, password: string) => {
    const { token: authToken, user: loggedInUser, memberships: nextMemberships, activeContext: nextActiveContext } = await loginRequest(email, password);
    setToken(authToken);
    await hydrateFromMe();
    return { user: loggedInUser, memberships: nextMemberships, activeContext: nextActiveContext };
  }, [hydrateFromMe]);

  const signup = useCallback(async (email: string, password: string, role?: SignupRole) => {
    const { token: authToken, user: signedUpUser, memberships: nextMemberships, activeContext: nextActiveContext, emailDeliveryWarning } = await signupRequest(email, password, role);
    setToken(authToken);
    await hydrateFromMe();
    return { user: signedUpUser, memberships: nextMemberships, activeContext: nextActiveContext, emailDeliveryWarning };
  }, [hydrateFromMe]);

  const acceptInvite = useCallback(async (input: { token: string; password?: string; email?: string; name?: string }) => {
    const { token: authToken, user: invitedUser, memberships: nextMemberships, activeContext: nextActiveContext } = await acceptInviteRequest(input);
    setToken(authToken);
    await hydrateFromMe();
    return { user: invitedUser, memberships: nextMemberships, activeContext: nextActiveContext };
  }, [hydrateFromMe]);

  const chooseContext = useCallback(async (tenantId: string, gymId?: string) => {
    const { token: nextToken } = await setContextRequest(tenantId, gymId);
    setToken(nextToken);
    await hydrateFromMe();
  }, [hydrateFromMe]);

  const switchMode = useCallback(async (tenantId: string, mode: 'OWNER' | 'MANAGER', locationId?: string) => {
    const meResponse = await setModeRequest(tenantId, mode, locationId);
    applyMeResponse(meResponse);
  }, [applyMeResponse]);

  const logout = useCallback(() => {
    clearToken();
    setMeStatus(null);
    setAuthIssue(null);
    clearAuthState();
  }, [clearAuthState]);

  const refreshUser = useCallback(async () => {
    const existingToken = getToken();
    if (!existingToken) {
      clearAuthState();
      setMeStatus(null);
      setAuthIssue(null);
      return null;
    }

    try {
      const meResponse = await hydrateFromMe();
      setToken(existingToken);
      return meResponse.user;
    } catch (error) {
      if (error instanceof ApiFetchError && error.statusCode === 403) {
        return null;
      }

      clearToken();
      clearAuthState();
      return null;
    }
  }, [clearAuthState, hydrateFromMe]);

  const value = useMemo(
    () => ({
      user,
      role: user?.role ?? null,
      token,
      loading: isLoading,
      isLoading,
      isAuthenticated: Boolean(token) && (Boolean(user) || authIssue === 'INSUFFICIENT_PERMISSIONS'),
      meStatus,
      authIssue,
      memberships,
      platformRole,
      permissions,
      activeContext,
      effectiveRole,
      activeMode,
      onboarding,
      ownerOperatorSettings,
      login,
      signup,
      acceptInvite,
      chooseContext,
      switchMode,
      logout,
      refreshUser,
    }),
    [user, token, isLoading, meStatus, authIssue, memberships, platformRole, permissions, activeContext, effectiveRole, activeMode, onboarding, ownerOperatorSettings, login, signup, acceptInvite, chooseContext, switchMode, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }

  return context;
}
