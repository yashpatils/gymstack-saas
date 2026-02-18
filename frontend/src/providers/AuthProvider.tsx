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
  resendVerification as resendVerificationRequest,
  setContext as setContextRequest,
  signup as signupRequest,
  type SignupRole,
  verifyEmail as verifyEmailRequest,
} from '../lib/auth';
import type { ActiveLocation, ActiveTenant, Membership, MembershipRole, OnboardingState, OwnerOperatorSettings, PermissionFlags, TenantFeatures } from '../types/auth';
import { setStoredPlatformRole, setSupportModeContext } from '../lib/supportMode';
import { ApiFetchError } from '../lib/apiFetch';
import { clearStoredActiveContext, setStoredActiveContext } from '../lib/auth/contextStore';
import { initFrontendMonitoring, setMonitoringUserContext } from '../lib/monitoring';
import { track } from '../lib/analytics';

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
  login: (email: string, password: string, options?: { adminOnly?: boolean; tenantId?: string; tenantSlug?: string }) => Promise<{ user: AuthUser; memberships: Membership[]; activeContext?: ActiveContext }>;
  signup: (email: string, password: string, role?: SignupRole, inviteToken?: string) => Promise<{ user: AuthUser; memberships: Membership[]; activeContext?: ActiveContext; emailDeliveryWarning?: string }>;
  acceptInvite: (input: { token: string; password?: string; email?: string; name?: string }) => Promise<{ user: AuthUser; memberships: Membership[]; activeContext?: ActiveContext }>;
  chooseContext: (tenantId: string, locationId?: string, mode?: 'OWNER' | 'MANAGER') => Promise<void>;
  switchMode: (tenantId: string, mode: 'OWNER' | 'MANAGER', locationId?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<AuthUser | null>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerification: (email: string) => Promise<{ ok: true; message: string; emailDeliveryWarning?: string }>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
  }, [normalizeMemberships, normalizePermissions]);

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
    initFrontendMonitoring();
  }, []);

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

  const login = useCallback(async (email: string, password: string, options?: { adminOnly?: boolean; tenantId?: string; tenantSlug?: string }) => {
    const { token: authToken, user: loggedInUser, memberships: nextMemberships, activeContext: nextActiveContext } = await loginRequest(email, password, { tenantId: options?.tenantId, tenantSlug: options?.tenantSlug });
    setToken(authToken);
    await hydrateFromMe();
    await track('login_success', { role: loggedInUser.role });
    return { user: loggedInUser, memberships: normalizeMemberships(nextMemberships), activeContext: nextActiveContext };
  }, [hydrateFromMe, normalizeMemberships]);

  const signup = useCallback(async (email: string, password: string, role?: SignupRole, inviteToken?: string) => {
    const { token: authToken, user: signedUpUser, memberships: nextMemberships, activeContext: nextActiveContext, emailDeliveryWarning } = await signupRequest(email, password, role, inviteToken);
    setToken(authToken);
    await hydrateFromMe();
    await track('signup_success', { role: signedUpUser.role });
    return { user: signedUpUser, memberships: normalizeMemberships(nextMemberships), activeContext: nextActiveContext, emailDeliveryWarning };
  }, [hydrateFromMe, normalizeMemberships]);

  const acceptInvite = useCallback(async (input: { token: string; password?: string; email?: string; name?: string }) => {
    const { token: authToken, user: invitedUser, memberships: nextMemberships, activeContext: nextActiveContext } = await acceptInviteRequest(input);
    setToken(authToken);
    await hydrateFromMe();
    await track('invite_consumed', { role: invitedUser.role });
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

  const verifyEmail = useCallback(async (tokenToVerify: string) => {
    await verifyEmailRequest(tokenToVerify);
    await refreshUser();
  }, [refreshUser]);

  const resendVerification = useCallback(async (email: string) => {
    const response = await resendVerificationRequest(email);
    await refreshUser();
    return response;
  }, [refreshUser]);

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
      permissionKeys,
      activeContext,
      activeTenant,
      activeLocation,
      tenantFeatures,
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
      verifyEmail,
      resendVerification,
    }),
    [user, token, isLoading, meStatus, authIssue, memberships, platformRole, permissions, permissionKeys, activeContext, activeTenant, activeLocation, tenantFeatures, effectiveRole, activeMode, onboarding, ownerOperatorSettings, login, signup, acceptInvite, chooseContext, switchMode, logout, refreshUser, verifyEmail, resendVerification],
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
