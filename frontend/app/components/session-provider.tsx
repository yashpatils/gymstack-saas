"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { defaultSession, normalizeSession, Session } from "../lib/auth";

const SessionContext = createContext<Session>(defaultSession);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session>(defaultSession);

  useEffect(() => {
    const stored = window.localStorage.getItem("gymstack-session");
    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      setSession(normalizeSession(parsed));
    } catch {
      setSession(defaultSession);
    }
  }, []);

  const value = useMemo(() => session, [session]);

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
