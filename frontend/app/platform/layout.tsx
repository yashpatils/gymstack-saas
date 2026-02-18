"use client";

import { AppShell } from "./app-shell";

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
