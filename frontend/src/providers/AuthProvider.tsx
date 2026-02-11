"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  type AuthUser,
  getToken,
  login as loginRequest,
  logout as clearToken,
  me,
  signup as signupRequest,
} from "../lib/auth";
import { normalizeRole, type AppRole } from "../lib/rbac";

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  signup: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      const existingToken = getToken();
      setToken(existingToken);

      if (!existingToken) {
        if (isMounted) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      try {
        const currentUser = await me();
        if (isMounted) {
          setUser(currentUser);
        }
      } catch {
        if (isMounted) {
          setUser(null);
          setToken(null);
        }
        clearToken();
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadUser();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token: authToken, user: loggedInUser } = await loginRequest(
      email,
      password,
    );
    setToken(authToken);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const signup = useCallback(async (email: string, password: string) => {
    const { token: authToken, user: signedUpUser } = await signupRequest(
      email,
      password,
    );
    setToken(authToken);
    setUser(signedUpUser);
    return signedUpUser;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, token, loading, login, signup, logout }),
    [user, token, loading, login, signup, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
}
