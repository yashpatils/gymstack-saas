import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { RequireAuth } from "../../src/components/auth/RequireAuth";

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  const cookieStore = cookies();
  const hasSession = Boolean(cookieStore.get("gymstack_token")?.value || cookieStore.get("gymstack_refresh_token")?.value);

  if (!hasSession) {
    redirect("/login?next=/admin");
  }

  return <RequireAuth>{children}</RequireAuth>;
}
