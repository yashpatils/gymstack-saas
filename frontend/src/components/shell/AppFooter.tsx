"use client";

import Link from "next/link";
import { useAuth } from "../../providers/AuthProvider";

export function AppFooter() {
  const { activeContext, tenantFeatures, activeLocation } = useAuth();
  const role = activeContext?.role;

  if (role === "TENANT_OWNER") {
    return (
      <footer className="platform-footer">
        <div>
          <p className="text-xs text-muted-foreground">© 2026 Gym Stack · All rights reserved</p>
        </div>
        <div className="platform-footer-links">
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/platform/support">Support</Link>
        </div>
      </footer>
    );
  }

  if (role !== "TENANT_LOCATION_ADMIN" && role !== "GYM_STAFF_COACH" && role !== "CLIENT") {
    return null;
  }

  if (tenantFeatures?.whiteLabelBranding || Boolean(activeLocation?.customDomain)) {
    return null;
  }

  return (
    <footer className="platform-footer platform-footer-minimal">
      <p>Powered by Gym Stack © 2026</p>
    </footer>
  );
}
