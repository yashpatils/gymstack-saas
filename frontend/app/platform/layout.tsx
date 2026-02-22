import type { ReactNode } from "react";
import { getPlatformSessionOrRedirect } from "./_lib/server-platform-api";
import { AppShellProvider } from "./app-shell";

export default async function PlatformLayout({ children }: { children: ReactNode }) {
  await getPlatformSessionOrRedirect();
  return <AppShellProvider>{children}</AppShellProvider>;
}
