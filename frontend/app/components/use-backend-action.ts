"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../src/lib/api";

export function useBackendAction() {
  const [backendResponse, setBackendResponse] = useState<string | null>(null);
  const router = useRouter();

  const callBackend = useCallback(async (action: string) => {
    try {
      const response = await apiFetch("/health");
      if (response.status === 401) {
        router.push("/login");
        return;
      }
      if (!response.ok) {
        const errorText = await response.text();
        if (errorText.includes("Cannot GET")) {
          setBackendResponse(
            `${action}: Cannot GET - check route or HTTP method.`,
          );
          return;
        }
        setBackendResponse(
          `${action}: Backend response error (${response.status}).`,
        );
        return;
      }
      const data = await response.json();
      setBackendResponse(`${action}: ${JSON.stringify(data)}`);
    } catch (error) {
      setBackendResponse(`${action}: Unable to reach backend.`);
    }
  }, [router]);

  return { backendResponse, callBackend };
}
