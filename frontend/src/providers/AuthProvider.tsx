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
  logout as logoutRequest,
  me as getMe,
  refreshAccessToken,
  resendVerification as resendVerificationRequest,
  setContext as setContextRequest,
  signup as signupRequest,
  type SignupRole,
  verifyEmail as verifyEmailRequest,
} from '../lib/auth';
import type { ActiveLocation, ActiveTenant, GatingStatus, Membership, MembershipRole, OnboardingState, OwnerOperatorSettings, PermissionFlags, TenantFeatures } from '../types/auth';
import type { FrontendLoginResult, LoginOptions } from '../lib/auth.types';
import { setStoredPlatformRole, setSupportModeContext } from '../lib/supportMode';
import { ApiFetchError } from '../lib/apiFetch';
import { clearStoredActiveContext, setStoredActiveContext } from '../lib/auth/contextStore';
import { initFrontendMonitoring, setMonitoringUserContext } from '../lib/monitoring';
import { track } from '../lib/analytics';

export type AuthIssue = 'SESSION_EXPIRED' | 'INSUFFICIENT_PERMISSIONS' | null;
export type AuthState = 'hydrating' | 'authed' | 'guest';
export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type AuthContextValue = {
  user: AuthUser | null;
  role: string | null;
  token: string | null;
  loading: boolean;
  isLoading: boolean;
  isHydrating: boolean;
  isAuthenticated: boolean;
  authState: AuthState;
  authStatus: AuthStatus;
  meStatus: 200 | 401 | 403 | null;
  authIssue: AuthIssue;
  memberships: Membership[];
  platformRole?: 'PLATFORM_ADMIN' | null;
  permissions: PermissionFlags;
  permissionKeys: string[];
  activeContext?: ActiveContext;
  activeTenant?: ActiveTenant;
  activeLocation?: ActiveLocation;
  tenantFeatures?: TenantFeatures;
  effectiveRole?: MembershipRole;
  activeMode?: 'OWNER' | 'MANAGER';
  onboarding?: OnboardingState;
  ownerOperatorSettings?: OwnerOperatorSettings | null;
  qaBypass: boolean;
  effectiveAccess?: boolean;
  gatingStatus?: GatingStatus;
  qaModeEnabled: boolean;
  login: (email: string, password: string, options?: LoginOptions) => Promise<FrontendLoginResult>;
  signup: (email: string, password: string, role?: SignupRole, inviteToken?: string) => Promise<{ user: AuthUser; memberships: Membership[]; activeContext?: ActiveContext; emailDeliveryWarning?: string }>;
  acceptInvite: (input: { token: string; password?: string; email?: string; name?: string }) => Promise<{ user: AuthUser; memberships: Membership[]; activeContext?: ActiveContext }>;
  chooseContext: (tenantId: string, locationId?: string, mode?: 'OWNER' | 'MANAGER') => Promise<void>;
  switchMode: (tenantId: string, mode: 'OWNER' | 'MANAGER', locationId?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<AuthUser | null>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerification: (email: string) => Promise<{ ok: true; message: string; emailDeliveryWarning?: string }>;
};

const AuthContext = createContext<AuthContextValue | null>(null);


const AUTH_HYDRATION_TIMEOUT_MS = 5000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const authDebugEnabled = process.env.NEXT_PUBLIC_AUTH_DEBUG === 'true' || process.env.NODE_ENV === 'development';
  const authDebugLog = useCallback((event: string, detail?: Record<string, unknown>) => {
    if (!authDebugEnabled) {
      return;
    }
    console.debug(`[auth] ${event}`, detail ?? {});
  }, [authDebugEnabled]);

  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => (typeof window === 'undefined' ? null : getToken()));
  const [isLoading, setIsLoading] = useState(true);
  const [isHydrating, setIsHydrating] = useState(true);
  const [authState, setAuthState] = useState<AuthState>('hydrating');
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [platformRole, setPlatformRole] = useState<'PLATFORM_ADMIN' | null>(null);
  const [permissions, setPermissions] = useState<PermissionFlags>({
    canManageTenant: false,
    canManageLocations: false,
    canInviteStaff: false,
    canInviteClients: false,
    canManageBilling: false,
    canManageUsers: false,
  });
  const [permissionKeys, setPermissionKeys] = useState<string[]>([]);
  const [activeContext, setActiveContext] = useState<ActiveContext | undefined>(undefined);
  const [activeTenant, setActiveTenant] = useState<ActiveTenant | undefined>(undefined);
  const [activeLocation, setActiveLocation] = useState<ActiveLocation | undefined>(undefined);
  const [tenantFeatures, setTenantFeatures] = useState<TenantFeatures | undefined>(undefined);
  const [effectiveRole, setEffectiveRole] = useState<MembershipRole | undefined>(undefined);
  const [activeMode, setActiveMode] = useState<'OWNER' | 'MANAGER' | undefined>(undefined);
  const [onboarding, setOnboarding] = useState<OnboardingState | undefined>(undefined);
  const [ownerOperatorSettings, setOwnerOperatorSettings] = useState<OwnerOperatorSettings | null | undefined>(undefined);
  const [meStatus, setMeStatus] = useState<200 | 401 | 403 | null>(null);
  const [authIssue, setAuthIssue] = useState<AuthIssue>(null);
  const [qaBypass, setQaBypass] = useState(false);
  const [effectiveAccess, setEffectiveAccess] = useState<boolean | undefined>(undefined);
  const [gatingStatus, setGatingStatus] = useState<GatingStatus | undefined>(undefined);
  const [qaModeEnabled, setQaModeEnabled] = useState(false);

  const clearAuthState = useCallback(() => {
    setMonitoringUserContext(null);
    setUser(null);
    setToken(null);
    setMemberships([]);
    setPlatformRole(null);
    setStoredPlatformRole(null);
    setSupportModeContext(null);
    clearStoredActiveContext();
    setPermissions({
      canManageTenant: false,
      canManageLocations: false,
      canInviteStaff: false,
      canInviteClients: false,
      canManageBilling: false,
      canManageUsers: false,
    });
    setPermissionKeys([]);
    setActiveContext(undefined);
    setActiveTenant(undefined);
    setActiveLocation(undefined);
    setTenantFeatures(undefined);
    setEffectiveRole(undefined);
    setActiveMode(undefined);
    setOnboarding(undefined);
    setOwnerOperatorSettings(undefined);
    setQaBypass(false);
    setEffectiveAccess(undefined);
    setGatingStatus(undefined);
    setQaModeEnabled(false);
    setAuthState('guest');
  }, []);

  const normalizeMemberships = useCallback((source: AuthMeResponse['memberships']): Membership[] => {
    if (Array.isArray(source)) {
      return source;
    }

    const tenantMemberships: Membership[] = source.tenant.map((membership, index) => ({
      id: `tenant-${membership.tenantId}-${index}`,
      tenantId: membership.tenantId,
      gymId: null,
      locationId: null,
      role: membership.role,
      status: 'ACTIVE',
    }));

    const locationMemberships: Membership[] = source.location.map((membership, index) => ({
      id: `location-${membership.locationId}-${index}`,
      tenantId: membership.tenantId,
      gymId: membership.locationId,
      locationId: membership.locationId,
      role: membership.role,
      status: 'ACTIVE',
    }));

    return [...tenantMemberships, ...locationMemberships];
  }, []);

  const normalizePermissions = useCallback((source: AuthMeResponse['permissions']): PermissionFlags => {
    if (Array.isArray(source)) {
      return {
        canManageTenant: source.includes('tenant:manage'),
        canManageLocations: source.includes('location:manage') || source.includes('locations:update'),
        canInviteStaff: source.includes('staff:crud') || source.includes('invites:staff:create'),
        canInviteClients: source.includes('clients:crud') || source.includes('invites:clients:create'),
        canManageBilling: source.includes('billing:manage'),
        canManageUsers: source.includes('users:crud') || source.includes('users:manage'),
      };
    }

    return source;
  }, []);

  const applyMeResponse = useCallback((meResponse: AuthMeResponse) => {
    setMonitoringUserContext(meResponse.user.id);
    setMeStatus(200);
    setAuthIssue(null);
    setUser(meResponse.user);
    setMemberships(normalizeMemberships(meResponse.memberships));
    const nextPlatformRole = meResponse.isPlatformAdmin ? 'PLATFORM_ADMIN' : (meResponse.platformRole ?? null);
    setPlatformRole(nextPlatformRole);
    setStoredPlatformRole(nextPlatformRole);
    if (nextPlatformRole !== 'PLATFORM_ADMIN') {
      setSupportModeContext(null);
    }
    setPermissions(normalizePermissions(meResponse.permissions));
    setPermissionKeys(meResponse.permissionKeys ?? []);
    setActiveContext(meResponse.activeContext);
    setStoredActiveContext(meResponse.activeContext);
    setActiveTenant(meResponse.activeTenant);
    setActiveLocation(meResponse.activeLocation);
    setTenantFeatures(meResponse.tenantFeatures);
    setEffectiveRole(meResponse.effectiveRole);
    setActiveMode(meResponse.activeMode);
    setOnboarding(meResponse.onboarding);
    setOwnerOperatorSettings(meResponse.ownerOperatorSettings);
    setQaBypass(Boolean(meResponse.qaBypass ?? meResponse.user.qaBypass));
    setEffectiveAccess(meResponse.effectiveAccess);
    setGatingStatus(meResponse.gatingStatus);
    setQaModeEnabled(Boolean(meResponse.qaModeEnabled));
    setAuthState('authed');
  }, [normalizeMemberships, normalizePermissions]);

  const hydrateFromMe = useCallback(async () => {
    authDebugLog('me:start');
    try {
      const meResponse = await getMe();
      applyMeResponse(meResponse);
      authDebugLog('me:success', {
        userId: meResponse.user.id,
        memberships: Array.isArray(meResponse.memberships) ? meResponse.memberships.length : undefined,
      });
      return meResponse;
    } catch (error) {
      if (error instanceof ApiFetchError && error.statusCode === 403) {
        setMeStatus(403);
        setAuthIssue('INSUFFICIENT_PERMISSIONS');
        authDebugLog('me:forbidden');
      }
      if (error instanceof ApiFetchError && error.statusCode === 401) {
        authDebugLog('me:unauthorized');
      }
      throw error;
    }
  }, [applyMeResponse, authDebugLog]);

  const hydrateWithRecovery = useCallback(async () => {
    try {
      return await hydrateFromMe();
    } catch (error) {
      if (error instanceof ApiFetchError && error.statusCode === 401) {
        authDebugLog('refresh:attempt');
        const nextToken = await refreshAccessToken();
        if (!nextToken) {
          setMeStatus(401);
          setAuthIssue('SESSION_EXPIRED');
          authDebugLog('refresh:failed');
          throw error;
        }

        setToken(nextToken);
        authDebugLog('refresh:success');
        try {
          return await hydrateFromMe();
        } catch (retryError) {
          if (retryError instanceof ApiFetchError && retryError.statusCode === 401) {
            setMeStatus(401);
            setAuthIssue('SESSION_EXPIRED');
            authDebugLog('me:retry-unauthorized');
          }
          throw retryError;
        }
      }

      throw error;
    }
  }, [authDebugLog, hydrateFromMe]);

  useEffect(() => {
    initFrontendMonitoring();
  }, []);

  useEffect(() => {
    if (!isHydrating || !token || typeof window === 'undefined') {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      authDebugLog('hydrate:timeout', { timeoutMs: AUTH_HYDRATION_TIMEOUT_MS });
      clearAuthState();
      setMeStatus(401);
      setAuthIssue('SESSION_EXPIRED');
      setIsLoading(false);
      setIsHydrating(false);
    }, AUTH_HYDRATION_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [authDebugLog, clearAuthState, isHydrating, token]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleSessionExpired = () => {
      clearAuthState();
      setToken(null);
      setMeStatus(401);
      setAuthIssue('SESSION_EXPIRED');
      setIsLoading(false);
      setIsHydrating(false);
    };

    window.addEventListener('gymstack:session-expired', handleSessionExpired as EventListener);
    return () => {
      window.removeEventListener('gymstack:session-expired', handleSessionExpired as EventListener);
    };
  }, [clearAuthState]);

  useEffect(() => {
    let isMounted = true;
    const loadUser = async () => {
      authDebugLog('hydrate:start');
      setAuthState('hydrating');
      setIsHydrating(true);
      const existingToken = getToken();
      if (!isMounted) return;

      setToken(existingToken);
      if (!existingToken) {
        authDebugLog('hydrate:no-token');
        clearAuthState();
        setMeStatus(401);
        setAuthIssue('SESSION_EXPIRED');
        setIsLoading(false);
        setIsHydrating(false);
        setAuthState('guest');
        return;
      }

      try {
        await hydrateWithRecovery();
        if (isMounted) {
          setAuthState('authed');
          authDebugLog('hydrate:authed');
        }
      } catch (error) {
        if (error instanceof ApiFetchError) {
          authDebugLog('hydrate:api-error', { statusCode: error.statusCode });
        } else {
          authDebugLog('hydrate:unknown-error');
        }

        if (isMounted) {
          clearAuthState();
          setMeStatus(401);
          setAuthIssue('SESSION_EXPIRED');
          setAuthState('guest');
        }

        await logoutRequest();
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsHydrating(false);
          authDebugLog('hydrate:complete', { authState: existingToken ? 'authed-or-guest' : 'guest' });
        }
      }
    };

    void loadUser();

    return () => {
      isMounted = false;
    };
  }, [authDebugLog, clearAuthState, hydrateWithRecovery]);

  const login = useCallback(async (email: string, password: string, options?: LoginOptions): Promise<FrontendLoginResult> => {
    authDebugLog('login:start');
    const loginResult = await loginRequest(email, password, {
      adminOnly: options?.adminOnly,
      tenantId: options?.tenantId,
      tenantSlug: options?.tenantSlug,
    });

    if (loginResult.status === 'OTP_REQUIRED') {
      return loginResult;
    }

    const { token: authToken, user: loggedInUser, memberships: nextMemberships, activeContext: nextActiveContext } = loginResult;
    setToken(authToken);
    await hydrateFromMe();
    authDebugLog('login:success', { userId: loggedInUser.id });
    await track('login_success', { role: loggedInUser.role ?? undefined });
    return { ...loginResult, memberships: normalizeMemberships(nextMemberships), activeContext: nextActiveContext };
  }, [authDebugLog, hydrateFromMe, normalizeMemberships]);

  const signup = useCallback(async (email: string, password: string, role?: SignupRole, inviteToken?: string) => {
    const { token: authToken, user: signedUpUser, memberships: nextMemberships, activeContext: nextActiveContext, emailDeliveryWarning } = await signupRequest(email, password, role, inviteToken);
    setToken(authToken);
    await hydrateFromMe();
    await track('signup_success', { role: signedUpUser.role ?? undefined });
    return { user: signedUpUser, memberships: normalizeMemberships(nextMemberships), activeContext: nextActiveContext, emailDeliveryWarning };
  }, [hydrateFromMe, normalizeMemberships]);

  const acceptInvite = useCallback(async (input: { token: string; password?: string; email?: string; name?: string }) => {
    const { token: authToken, user: invitedUser, memberships: nextMemberships, activeContext: nextActiveContext } = await acceptInviteRequest(input);
    setToken(authToken);
    await hydrateFromMe();
    await track('invite_consumed', { role: invitedUser.role ?? undefined });
    return { user: invitedUser, memberships: normalizeMemberships(nextMemberships), activeContext: nextActiveContext };
  }, [hydrateFromMe, normalizeMemberships]);

  const chooseContext = useCallback(async (tenantId: string, locationId?: string, mode: 'OWNER' | 'MANAGER' = 'OWNER') => {
    const { token: nextToken, me } = await setContextRequest(tenantId, locationId, mode);
    setToken(nextToken);
    applyMeResponse(me);
  }, [applyMeResponse]);

  const switchMode = useCallback(async (tenantId: string, mode: 'OWNER' | 'MANAGER', locationId?: string) => {
    const { token: nextToken, me } = await setContextRequest(tenantId, locationId, mode);
    setToken(nextToken);
    applyMeResponse(me);
  }, [applyMeResponse]);

  const logout = useCallback(async () => {
    authDebugLog('logout:start');
    try {
      await logoutRequest();
    } catch {
      authDebugLog('logout:api-failed');
    } finally {
      clearAuthState();
      setMeStatus(401);
      setAuthIssue(null);
      setAuthState('guest');
      authDebugLog('logout:complete');
    }
  }, [authDebugLog, clearAuthState]);

  const refreshUser = useCallback(async () => {
    const existingToken = getToken();
    if (!existingToken) {
      clearAuthState();
      setMeStatus(401);
      setAuthIssue('SESSION_EXPIRED');
      return null;
    }

    try {
      const meResponse = await hydrateWithRecovery();
      setToken(getToken());
      return meResponse.user;
    } catch (error) {
      if (error instanceof ApiFetchError) {
        if (error.statusCode === 403) {
          return null;
        }
        if (error.statusCode === 401) {
          await logoutRequest();
          clearAuthState();
          setMeStatus(401);
          setAuthIssue('SESSION_EXPIRED');
          return null;
        }
      }

      return user;
    }
  }, [clearAuthState, hydrateWithRecovery, user]);

  const verifyEmail = useCallback(async (tokenToVerify: string) => {
    await verifyEmailRequest(tokenToVerify);
    await refreshUser();
  }, [refreshUser]);

  const resendVerification = useCallback(async (email: string) => {
    const response = await resendVerificationRequest(email);
    await refreshUser();
    return response;
  }, [refreshUser]);

  const authStatus: AuthStatus = authState === 'hydrating' || isHydrating || isLoading
    ? 'loading'
    : authState === 'authed' && Boolean(user)
      ? 'authenticated'
      : 'unauthenticated';

  const value: AuthContextValue = useMemo(
    () => ({
      user,
      role: user?.role ?? null,
      token,
      loading: isLoading,
      isLoading,
      isHydrating,
      isAuthenticated: authState === 'authed',
      authState,
      authStatus,
      meStatus,
      authIssue,
      memberships,
      platformRole,
      permissions,
      permissionKeys,
      activeContext,
      activeTenant,
      activeLocation,
      tenantFeatures,
      effectiveRole,
      activeMode,
      onboarding,
      ownerOperatorSettings,
      qaBypass,
      effectiveAccess,
      gatingStatus,
      qaModeEnabled,
      login,
      signup,
      acceptInvite,
      chooseContext,
      switchMode,
      logout,
      refreshUser,
      verifyEmail,
      resendVerification,
    }),
    [user, token, isLoading, isHydrating, meStatus, authIssue, memberships, platformRole, permissions, permissionKeys, activeContext, activeTenant, activeLocation, tenantFeatures, effectiveRole, activeMode, onboarding, ownerOperatorSettings, qaBypass, effectiveAccess, gatingStatus, authState, authStatus, login, signup, acceptInvite, chooseContext, switchMode, logout, refreshUser, verifyEmail, resendVerification],
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
