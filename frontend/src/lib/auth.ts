import { ApiFetchError, apiFetch } from "./apiFetch";
import type { AuthMeResponse, AuthUser } from "../types/auth";

const TOKEN_STORAGE_KEY = "gymstack_token";

type AuthResponse = {
  accessToken: string;
  user: AuthUser;
};

export type { AuthUser, AuthMeResponse };

export function getToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

function setToken(token: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const secureAttribute = window.location.protocol === "https:" ? "; Secure" : "";

  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  document.cookie = `gymstack_token=${token}; Path=/; SameSite=Lax${secureAttribute}`;
}

export async function login(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const data = await apiFetch<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    headers: {
      "Content-Type": "application/json",
    },
  });

  setToken(data.accessToken);
  return {
    token: data.accessToken,
    user: data.user,
  };
}

export async function signup(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const data = await apiFetch<AuthResponse>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    headers: {
      "Content-Type": "application/json",
    },
  });

  setToken(data.accessToken);
  return {
    token: data.accessToken,
    user: data.user,
  };
}

export async function me(): Promise<AuthMeResponse> {
  try {
    return await apiFetch<AuthMeResponse>("/api/auth/me", { method: "GET" });
  } catch (error) {
    if (error instanceof ApiFetchError && error.statusCode === 401) {
      logout();
    }
    throw error;
  }
}

export function logout(): void {
  if (typeof window === "undefined") {
    return;
  }

  const secureAttribute = window.location.protocol === "https:" ? "; Secure" : "";

  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  document.cookie =
    `gymstack_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${secureAttribute}`;
}
