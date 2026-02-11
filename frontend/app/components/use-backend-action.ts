"use client";

import { useCallback, useState } from "react";
import { apiFetch } from "../lib/api";

export function useBackendAction() {
  const [backendResponse, setBackendResponse] = useState<string | null>(null);
  const callBackend = useCallback(async (action: string) => {
    try {
      const data = await apiFetch<Record<string, unknown>>("/api/health");
      setBackendResponse(`${action}: ${JSON.stringify(data)}`);
    } catch (error) {
      setBackendResponse(
        `${action}: ${
          error instanceof Error ? error.message : "Unable to reach backend."
        }`,
      );
    }
  }, []);

  return { backendResponse, callBackend };
}
