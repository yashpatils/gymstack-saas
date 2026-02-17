import type { Metadata } from "next";
import { StatusClient } from "./status-client";
import { toAbsoluteUrl } from "../lib/site";

export const metadata: Metadata = {
  title: "GymStack System Status",
  description: "Current operational status of GymStack API and database services.",
  alternates: { canonical: toAbsoluteUrl("/status") },
};

export default function StatusPage() {
  return <StatusClient />;
}
