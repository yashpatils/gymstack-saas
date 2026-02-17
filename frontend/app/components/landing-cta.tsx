"use client";

import Link from "next/link";
import { useAuth } from "../../src/providers/AuthProvider";

export function LandingCta() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <><Link href="/platform" className="button lg">Go to Dashboard</Link><Link href="/platform/account" className="button secondary lg">Profile</Link></>;
  }

  return <><Link href="/signup" className="button lg">Start free trial</Link><Link href="mailto:sales@gymstack.club" className="button secondary lg">Book a demo</Link></>;
}
