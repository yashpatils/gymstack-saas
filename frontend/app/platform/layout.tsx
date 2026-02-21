import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShellProvider } from "./app-shell";
import { RequireAuth } from "../../src/components/auth/RequireAuth";

function getApiOrigin(): string {
  const apiUrl = (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "").trim();
  if (apiUrl) {
    return apiUrl.replace(/\/+$/, "");
  }
  return "http://localhost:3000";
}

async function hasValidSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const hasSessionCookie = Boolean(cookieStore.get("gymstack_token")?.value || cookieStore.get("gymstack_refresh_token")?.value);

  if (!hasSessionCookie) {
    return false;
  }

  try {
    const response = await fetch(`${getApiOrigin()}/api/auth/me`, {
      method: "GET",
      headers: {
        cookie: cookieStore.toString(),
        accept: "application/json",
      },
      cache: "no-store",
    });

    if (response.status === 401) {
      return false;
    }

    // Avoid a server-side redirect loop when the API is temporarily unavailable.
    // The client-side auth guard can still handle invalid sessions deterministically.
    return response.ok || response.status >= 500;
  } catch {
    // If we have auth cookies but cannot reach the API from the server runtime,
    // allow rendering and let the client guard finalize the session state.
    return true;
  }
}

export default async function PlatformLayout({ children }: { children: ReactNode }) {
  const validSession = await hasValidSession();

  if (!validSession) {
    redirect("/login?next=/platform");
  }

  return (
    <RequireAuth>
      <AppShellProvider>{children}</AppShellProvider>
    </RequireAuth>
  );
}
