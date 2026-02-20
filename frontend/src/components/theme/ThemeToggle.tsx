"use client";

import { useThemeConfig } from "../../providers/ThemeProvider";

export function ThemeToggle() {
  const { effectiveTheme, setThemeMode } = useThemeConfig();

  return (
    <button
      type="button"
      className="button secondary flex h-10 w-10 items-center justify-center rounded-xl px-0"
      onClick={() => setThemeMode(effectiveTheme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      <span aria-hidden="true">{effectiveTheme === "dark" ? "☀" : "☾"}</span>
    </button>
  );
}
