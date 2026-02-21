import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShellProvider } from "./app-shell";
import { RequireAuth } from "../../src/components/RequireAuth";

export default function PlatformLayout({ children }: { children: ReactNode }) {
  const cookieStore = cookies();
  const hasSession = Boolean(cookieStore.get("gymstack_token")?.value || cookieStore.get("gymstack_refresh_token")?.value);

  if (!hasSession) {
    redirect("/login?next=/platform");
  }

  return (
    <RequireAuth>
      <AppShellProvider>{children}</AppShellProvider>
    </RequireAuth>
  );
}
