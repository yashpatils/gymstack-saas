"use client";

import { useCallback, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export function useBackendAction() {
  const [backendResponse, setBackendResponse] = useState<string | null>(null);

  const callBackend = useCallback(async (action: string) => {
    if (!API_URL) {
      setBackendResponse(`${action}: Missing NEXT_PUBLIC_API_URL configuration.`);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/health`);
      const data = await response.json();
      setBackendResponse(`${action}: ${JSON.stringify(data)}`);
    } catch (error) {
      setBackendResponse(`${action}: Unable to reach backend.`);
    }
  }, []);

  return { backendResponse, callBackend };
}
