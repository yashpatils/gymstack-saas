"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PlatformShell } from "../components/platform-shell";
import { requireAuth } from "../../src/lib/auth";

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    requireAuth(router);
  }, [router]);

  return <PlatformShell>{children}</PlatformShell>;
}
