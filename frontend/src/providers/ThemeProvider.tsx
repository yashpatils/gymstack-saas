"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "./AuthProvider";
import { getThemeColorTokens } from "../styles/tokens";

export type ThemeMode = "light" | "dark" | "system";
export type EffectiveTheme = "light" | "dark";

const THEME_MODE_STORAGE_KEY = "gymstack.themeMode";

type ThemeConfig = {
  primaryColor: string;
  logoText: string;
  typography: "geist" | "system";
};

type ThemeContextValue = ThemeConfig & {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  effectiveTheme: EffectiveTheme;
};

const fallbackTheme: ThemeConfig = {
  primaryColor: "#8b5cf6",
  logoText: "GymStack",
  typography: "geist",
};

const ThemeContext = createContext<ThemeContextValue>({
  ...fallbackTheme,
  themeMode: "system",
  setThemeMode: () => undefined,
  effectiveTheme: "dark",
});

function getInitialThemeMode(): ThemeMode {
  if (typeof window === "undefined") {
    return "system";
  }

  const stored = window.localStorage.getItem(THEME_MODE_STORAGE_KEY);
  return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
}

function resolveEffectiveTheme(mode: ThemeMode): EffectiveTheme {
  if (typeof window === "undefined") {
    return "dark";
  }

  if (mode !== "system") {
    return mode;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { tenantFeatures, activeTenant } = useAuth();
  const [themeMode, setThemeModeState] = useState<ThemeMode>(getInitialThemeMode);
  const [effectiveTheme, setEffectiveTheme] = useState<EffectiveTheme>(() => resolveEffectiveTheme(getInitialThemeMode()));

  useEffect(() => {
    const nextEffectiveTheme = resolveEffectiveTheme(themeMode);
    setEffectiveTheme(nextEffectiveTheme);
    document.documentElement.dataset.theme = nextEffectiveTheme;
    const themeTokens = getThemeColorTokens(nextEffectiveTheme);
    Object.entries(themeTokens).forEach(([token, value]) => {
      document.documentElement.style.setProperty(token, value);
    });
    window.localStorage.setItem(THEME_MODE_STORAGE_KEY, themeMode);
  }, [themeMode]);

  useEffect(() => {
    if (themeMode !== "system") {
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const resolvedTheme = media.matches ? "dark" : "light";
      setEffectiveTheme(resolvedTheme);
      document.documentElement.dataset.theme = resolvedTheme;
      const themeTokens = getThemeColorTokens(resolvedTheme);
      Object.entries(themeTokens).forEach(([token, value]) => {
        document.documentElement.style.setProperty(token, value);
      });
    };

    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [themeMode]);

  const value = useMemo<ThemeContextValue>(() => {
    const canWhiteLabel = Boolean(tenantFeatures?.whiteLabelBranding || tenantFeatures?.whiteLabelEnabled);
    const config = canWhiteLabel
      ? {
          primaryColor: "#22d3ee",
          logoText: activeTenant?.name ?? "Tenant Portal",
          typography: "geist" as const,
        }
      : fallbackTheme;

    return {
      ...config,
      themeMode,
      setThemeMode: setThemeModeState,
      effectiveTheme,
    };
  }, [activeTenant?.name, effectiveTheme, tenantFeatures?.whiteLabelBranding, tenantFeatures?.whiteLabelEnabled, themeMode]);

  return (
    <ThemeContext.Provider value={value}>
      <div style={{ ["--brand-600" as string]: value.primaryColor }} className={value.typography === "system" ? "font-sans" : undefined}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useThemeConfig(): ThemeContextValue {
  return useContext(ThemeContext);
}
