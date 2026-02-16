"use client";

import React from "react";
import { TenantShell } from "../components/tenant-shell";
import { ProtectedRoute } from "../../src/components/ProtectedRoute";
import { EmailVerificationBanner } from "../components/email-verification-banner";

export const dynamic = "force-dynamic";

export default function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { tenant: string };
}) {
  return (
    <ProtectedRoute>
      <TenantShell tenantSlug={params.tenant}><div className="p-4"><EmailVerificationBanner /></div>{children}</TenantShell>
    </ProtectedRoute>
  );
}
