"use client";

import React from "react";
import { PlatformShell } from "../components/platform-shell";
import { ProtectedRoute } from "../../src/components/ProtectedRoute";

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <PlatformShell>{children}</PlatformShell>
    </ProtectedRoute>
  );
}
