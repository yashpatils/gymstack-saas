"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useAuth } from "./AuthProvider";

type ThemeConfig = {
  primaryColor: string;
  logoText: string;
  typography: "geist" | "system";
};

const fallbackTheme: ThemeConfig = {
  primaryColor: "#8b5cf6",
  logoText: "GymStack",
  typography: "geist",
};

const ThemeContext = createContext<ThemeConfig>(fallbackTheme);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { tenantFeatures, activeTenant } = useAuth();

  const value = useMemo<ThemeConfig>(() => {
    const canWhiteLabel = Boolean(tenantFeatures?.whiteLabelBranding || tenantFeatures?.whiteLabelEnabled);
    if (!canWhiteLabel) {
      return fallbackTheme;
    }

    return {
      primaryColor: "#22d3ee",
      logoText: activeTenant?.name ?? "Tenant Portal",
      typography: "geist",
    };
  }, [activeTenant?.name, tenantFeatures?.whiteLabelBranding, tenantFeatures?.whiteLabelEnabled]);

  return (
    <ThemeContext.Provider value={value}>
      <div style={{ ["--brand-600" as string]: value.primaryColor }} className={value.typography === "system" ? "font-sans" : undefined}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useThemeConfig(): ThemeConfig {
  return useContext(ThemeContext);
}
