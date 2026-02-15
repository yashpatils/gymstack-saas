"use client";

import Link from "next/link";
import { useAuth } from "../../providers/AuthProvider";

export function AppFooter() {
  const { activeContext, activeLocation, tenantFeatures } = useAuth();
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

  if (activeLocation?.customDomain) {
    if (tenantFeatures?.whiteLabelBranding) {
      return null;
    }

    return <footer className="platform-footer platform-footer-minimal"><p className="text-xs text-muted-foreground">Member portal</p></footer>;
  }

  return (
    <footer className="platform-footer platform-footer-minimal">
      <p>Powered by Gym Stack</p>
      <p>© 2026 Gym Stack</p>
    </footer>
  );
}
