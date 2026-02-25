import type { ReactNode } from "react";
import { getAdminSessionOrRedirect } from "../_lib/server-admin-api";
import AdminShellLayoutClient from "./admin-shell-layout-client";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await getAdminSessionOrRedirect();
  return <AdminShellLayoutClient>{children}</AdminShellLayoutClient>;
}
