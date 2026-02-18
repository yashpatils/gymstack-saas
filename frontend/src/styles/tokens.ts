export const designTokens = {
  spacing: {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "0.75rem",
    lg: "1rem",
    xl: "1.5rem",
    "2xl": "2rem",
    "3xl": "3rem",
  },
  radius: {
    sm: "0.5rem",
    md: "0.75rem",
    lg: "1rem",
    xl: "1.5rem",
    full: "9999px",
  },
  zIndex: {
    base: 1,
    header: 60,
    sidebar: 55,
    overlay: 50,
    modal: 70,
  },
  duration: {
    fast: "120ms",
    normal: "200ms",
    slow: "320ms",
  },
  layout: {
    contentMaxWidth: "80rem",
    contentPadding: "1.25rem",
  },
  sidebar: {
    expanded: "18rem",
    collapsed: "4.5rem",
    mobileNavHeight: "4.5rem",
  },
  header: {
    platform: "4rem",
    admin: "4rem",
    location: "3.5rem",
  },
} as const;

export const themeColorTokens = {
  dark: {
    "--bg": "#0c0f14",
    "--surface-1": "#131821",
    "--surface-2": "#181e28",
    "--surface-3": "#212937",
    "--surface-sidebar": "#121923",
    "--surface-overlay": "rgba(14, 19, 27, 0.86)",
    "--border": "rgba(148, 163, 184, 0.2)",
    "--text": "#e6edf8",
    "--text-muted": "#96a3bb",
    "--accent": "#8a98ff",
    "--accent-strong": "#6e7ef7",
  },
  light: {
    "--bg": "#f4f6fb",
    "--surface-1": "#ffffff",
    "--surface-2": "#f7f9ff",
    "--surface-3": "#edf1f8",
    "--surface-sidebar": "#f8fbff",
    "--surface-overlay": "rgba(255, 255, 255, 0.88)",
    "--border": "rgba(15, 23, 42, 0.12)",
    "--text": "#0f172a",
    "--text-muted": "#55627a",
    "--accent": "#4f46e5",
    "--accent-strong": "#4338ca",
  },
} as const;

export function getThemeColorTokens(theme: "light" | "dark"): Record<string, string> {
  return { ...themeColorTokens[theme] };
}

export function getTokenCssVariables(): Record<string, string> {
  return {
    "--space-xs": designTokens.spacing.xs,
    "--space-sm": designTokens.spacing.sm,
    "--space-md": designTokens.spacing.md,
    "--space-lg": designTokens.spacing.lg,
    "--space-xl": designTokens.spacing.xl,
    "--space-2xl": designTokens.spacing["2xl"],
    "--space-3xl": designTokens.spacing["3xl"],
    "--radius-sm": designTokens.radius.sm,
    "--radius-md": designTokens.radius.md,
    "--radius-lg": designTokens.radius.lg,
    "--radius-xl": designTokens.radius.xl,
    "--radius-full": designTokens.radius.full,
    "--z-base": String(designTokens.zIndex.base),
    "--z-header": String(designTokens.zIndex.header),
    "--z-sidebar": String(designTokens.zIndex.sidebar),
    "--z-overlay": String(designTokens.zIndex.overlay),
    "--z-modal": String(designTokens.zIndex.modal),
    "--duration-fast": designTokens.duration.fast,
    "--duration-normal": designTokens.duration.normal,
    "--duration-slow": designTokens.duration.slow,
    "--layout-content-max-width": designTokens.layout.contentMaxWidth,
    "--layout-content-padding": designTokens.layout.contentPadding,
    "--layout-sidebar-expanded": designTokens.sidebar.expanded,
    "--layout-sidebar-collapsed": designTokens.sidebar.collapsed,
    "--layout-mobile-nav-height": designTokens.sidebar.mobileNavHeight,
    "--layout-header-platform": designTokens.header.platform,
    "--layout-header-admin": designTokens.header.admin,
    "--layout-header-location": designTokens.header.location,
  };
}
