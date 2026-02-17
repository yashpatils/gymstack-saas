import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SessionProvider } from "./components/session-provider";
import { AuthProvider } from "../src/providers/AuthProvider";
import { ToastProvider } from "../src/components/toast/ToastProvider";
import { AuthDebugPanel } from "../src/components/auth/AuthDebugPanel";
import { defaultOgImage, SITE_URL } from "./lib/site";

const geist = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "GymStack SaaS | Multi-Location Gym Management Platform",
  description:
    "GymStack helps gym operators run billing, members, trainers, and analytics across every location from one dashboard.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "GymStack SaaS",
    description: "Launch and scale gym operations across locations with one operating platform.",
    url: SITE_URL,
    siteName: "GymStack",
    images: [{ url: defaultOgImage, width: 1200, height: 630, alt: "GymStack" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GymStack SaaS",
    description: "Launch and scale gym operations across locations with one operating platform.",
    images: [defaultOgImage],
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
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
