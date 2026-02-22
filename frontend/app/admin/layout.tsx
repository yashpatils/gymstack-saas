import type { ReactNode } from "react";
import { getAdminSessionOrRedirect } from "./_lib/server-admin-api";

export default async function AdminRootLayout({ children }: { children: ReactNode }) {
  await getAdminSessionOrRedirect();
  return children;
}
