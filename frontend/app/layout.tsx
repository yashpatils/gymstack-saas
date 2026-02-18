import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SessionProvider } from "./components/session-provider";
import { AuthProvider } from "../src/providers/AuthProvider";
import { ToastProvider } from "../src/components/toast/ToastProvider";
import { AuthDebugPanel } from "../src/components/auth/AuthDebugPanel";
import { PwaClient } from "./components/pwa-client";
import { ThemeProvider } from "../src/providers/ThemeProvider";
import { getTokenCssVariables } from "../src/styles/tokens";

const geist = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist",
});

const siteUrlEnv = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const siteUrl = /^https?:\/\//i.test(siteUrlEnv) ? siteUrlEnv : `https://${siteUrlEnv}`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "GymStack SaaS | Multi-Location Gym Management Platform",
  description:
    "GymStack helps gym operators run billing, members, trainers, and analytics across every location from one dashboard.",
  manifest: '/manifest.webmanifest',
  themeColor: '#0f172a',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Gym Stack',
  },
  icons: {
    apple: '/apple-touch-icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const themeBootstrapScript = `(() => {
    const key = 'gymstack.themeMode';
    const stored = window.localStorage.getItem(key);
    const mode = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
    const effective = mode === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : mode;
    document.documentElement.dataset.theme = effective;
  })();`;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body className={geist.variable} style={getTokenCssVariables()}>
        <AuthProvider>
          <ThemeProvider>
          <ToastProvider>
            <SessionProvider>{children}</SessionProvider>
            <AuthDebugPanel />
            <PwaClient />
          </ToastProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
