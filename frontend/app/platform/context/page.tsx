"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PlatformContextRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/select-workspace");
  }, [router]);

  return <p className="p-6 text-sm text-slate-300">Redirecting to workspace selector...</p>;
}
