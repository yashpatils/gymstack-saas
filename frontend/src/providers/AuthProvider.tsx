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
  type AuthUser,
  getToken,
  login as loginRequest,
  logout as clearToken,
  me as getMe,
  type SignupRole,
  setContext as setContextRequest,
  signup as signupRequest,
} from '../lib/auth';
import type { Membership } from '../types/auth';

type AuthContextValue = {
  user: AuthUser | null;
  role: string | null;
  token: string | null;
  loading: boolean;
  isLoading: boolean;
  memberships: Membership[];
  permissions: string[];
  activeContext?: ActiveContext;
  login: (email: string, password: string) => Promise<{ user: AuthUser; memberships: Membership[] }>;
  signup: (email: string, password: string, role?: SignupRole) => Promise<{ user: AuthUser; memberships: Membership[] }>;
  chooseContext: (tenantId: string, gymId?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<AuthUser | null>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [activeContext, setActiveContext] = useState<ActiveContext | undefined>(undefined);

  const hydrateFromMe = useCallback(async () => {
    const meResponse = await getMe();
    setUser(meResponse.user);
    setMemberships(meResponse.memberships ?? []);
    setPermissions(meResponse.permissions ?? []);
    setActiveContext(meResponse.activeContext);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      const existingToken = getToken();

      if (!isMounted) {
        return;
      }

      setToken(existingToken);

      if (!existingToken) {
        setUser(null);
        setMemberships([]);
        setPermissions([]);
        setIsLoading(false);
        return;
      }

      try {
        await hydrateFromMe();
      } catch {
        if (isMounted) {
          setUser(null);
          setToken(null);
          setMemberships([]);
          setPermissions([]);
          setActiveContext(undefined);
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
  }, [hydrateFromMe]);

  const login = useCallback(async (email: string, password: string) => {
    const { token: authToken, user: loggedInUser, memberships: nextMemberships, activeContext: nextActiveContext } = await loginRequest(email, password);
    setToken(authToken);
    setUser(loggedInUser);
    setMemberships(nextMemberships);
    setActiveContext(nextActiveContext);
    await hydrateFromMe();
    return { user: loggedInUser, memberships: nextMemberships };
  }, [hydrateFromMe]);

  const signup = useCallback(async (email: string, password: string, role?: SignupRole) => {
    const { token: authToken, user: signedUpUser, memberships: nextMemberships, activeContext: nextActiveContext } = await signupRequest(email, password, role);
    setToken(authToken);
    setUser(signedUpUser);
    setMemberships(nextMemberships);
    setActiveContext(nextActiveContext);
    await hydrateFromMe();
    return { user: signedUpUser, memberships: nextMemberships };
  }, [hydrateFromMe]);

  const chooseContext = useCallback(async (tenantId: string, gymId?: string) => {
    const { token: nextToken } = await setContextRequest(tenantId, gymId);
    setToken(nextToken);
    await hydrateFromMe();
  }, [hydrateFromMe]);

  const logout = useCallback(() => {
    clearToken();
    setToken(null);
    setUser(null);
    setMemberships([]);
    setPermissions([]);
    setActiveContext(undefined);
  }, []);

  const refreshUser = useCallback(async () => {
    const existingToken = getToken();

    if (!existingToken) {
      setToken(null);
      setUser(null);
      setMemberships([]);
      setPermissions([]);
      setActiveContext(undefined);
      return null;
    }

    try {
      const meResponse = await getMe();
      setUser(meResponse.user);
      setMemberships(meResponse.memberships ?? []);
      setPermissions(meResponse.permissions ?? []);
      setActiveContext(meResponse.activeContext);
      setToken(existingToken);
      return meResponse.user;
    } catch {
      clearToken();
      setToken(null);
      setUser(null);
      setMemberships([]);
      setPermissions([]);
      setActiveContext(undefined);
      return null;
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      role: user?.role ?? null,
      token,
      loading: isLoading,
      isLoading,
      memberships,
      permissions,
      activeContext,
      login,
      signup,
      chooseContext,
      logout,
      refreshUser,
    }),
    [user, token, isLoading, memberships, permissions, activeContext, login, signup, chooseContext, logout, refreshUser],
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
