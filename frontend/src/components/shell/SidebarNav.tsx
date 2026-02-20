"use client";

import type { ReactNode } from "react";
import { Sidebar, SidebarContent, type SidebarProps } from "./Sidebar";

export type SidebarNavProps = SidebarProps;

export function SidebarNavContent(props: SidebarNavProps): ReactNode {
  return <Sidebar {...props} mobileOpen />;
}

export function SidebarNav(props: SidebarNavProps): ReactNode {
  return <Sidebar {...props} />;
}

export { SidebarContent };
