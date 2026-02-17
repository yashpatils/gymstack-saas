import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SessionProvider } from "./components/session-provider";
import { AuthProvider } from "../src/providers/AuthProvider";
import { ToastProvider } from "../src/components/toast/ToastProvider";
import { AuthDebugPanel } from "../src/components/auth/AuthDebugPanel";
import { PwaClient } from "./components/pwa-client";

const geist = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist",
});

export const metadata: Metadata = {
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
  return (
    <html lang="en">
      <body className={geist.variable}>
        <AuthProvider>
          <ToastProvider>
            <SessionProvider>{children}</SessionProvider>
            <AuthDebugPanel />
            <PwaClient />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
