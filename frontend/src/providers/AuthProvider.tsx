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

type AuthContextValue = {
  user: AuthUser | null;
  role: string | null;
  token: string | null;
  loading: boolean;
  isLoading: boolean;
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

  const clearAuthState = useCallback(() => {
    setUser(null);
    setToken(null);
    setMemberships([]);
    setPlatformRole(null);
    setPermissions([]);
    setActiveContext(undefined);
    setEffectiveRole(undefined);
    setActiveMode(undefined);
    setOnboarding(undefined);
    setOwnerOperatorSettings(undefined);
  }, []);

  const applyMeResponse = useCallback((meResponse: AuthMeResponse) => {
    setUser(meResponse.user);
    setMemberships(meResponse.memberships ?? []);
    setPlatformRole(meResponse.platformRole ?? null);
    setPermissions(meResponse.permissions ?? []);
    setActiveContext(meResponse.activeContext);
    setEffectiveRole(meResponse.effectiveRole);
    setActiveMode(meResponse.activeMode);
    setOnboarding(meResponse.onboarding);
    setOwnerOperatorSettings(meResponse.ownerOperatorSettings);
  }, []);

  const hydrateFromMe = useCallback(async () => {
    const meResponse = await getMe();
    applyMeResponse(meResponse);
  }, [applyMeResponse]);

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      const existingToken = getToken();
      if (!isMounted) return;

      setToken(existingToken);
      if (!existingToken) {
        clearAuthState();
        setIsLoading(false);
        return;
      }

      try {
        await hydrateFromMe();
      } catch {
        if (isMounted) {
          clearAuthState();
        }
        clearToken();
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
    setUser(loggedInUser);
    setMemberships(nextMemberships);
    setActiveContext(nextActiveContext);
    await hydrateFromMe();
    return { user: loggedInUser, memberships: nextMemberships, activeContext: nextActiveContext };
  }, [hydrateFromMe]);

  const signup = useCallback(async (email: string, password: string, role?: SignupRole) => {
    const { token: authToken, user: signedUpUser, memberships: nextMemberships, activeContext: nextActiveContext, emailDeliveryWarning } = await signupRequest(email, password, role);
    setToken(authToken);
    setUser(signedUpUser);
    setMemberships(nextMemberships);
    setActiveContext(nextActiveContext);
    await hydrateFromMe();
    return { user: signedUpUser, memberships: nextMemberships, activeContext: nextActiveContext, emailDeliveryWarning };
  }, [hydrateFromMe]);

  const acceptInvite = useCallback(async (input: { token: string; password?: string; email?: string; name?: string }) => {
    const { token: authToken, user: invitedUser, memberships: nextMemberships, activeContext: nextActiveContext } = await acceptInviteRequest(input);
    setToken(authToken);
    setUser(invitedUser);
    setMemberships(nextMemberships);
    setActiveContext(nextActiveContext);
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
    clearAuthState();
  }, [clearAuthState]);

  const refreshUser = useCallback(async () => {
    const existingToken = getToken();
    if (!existingToken) {
      clearAuthState();
      return null;
    }

    try {
      const meResponse = await getMe();
      applyMeResponse(meResponse);
      setToken(existingToken);
      return meResponse.user;
    } catch {
      clearToken();
      clearAuthState();
      return null;
    }
  }, [applyMeResponse, clearAuthState]);

  const value = useMemo(
    () => ({
      user,
      role: user?.role ?? null,
      token,
      loading: isLoading,
      isLoading,
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
    [user, token, isLoading, memberships, platformRole, permissions, activeContext, effectiveRole, activeMode, onboarding, ownerOperatorSettings, login, signup, acceptInvite, chooseContext, switchMode, logout, refreshUser],
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
