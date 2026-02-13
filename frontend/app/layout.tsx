import "./globals.css";
import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import { SessionProvider } from "./components/session-provider";
import { AuthProvider } from "../src/providers/AuthProvider";
import { ToastProvider } from "../src/components/toast/ToastProvider";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const sora = Sora({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sora",
});

export const metadata: Metadata = {
  title: "GymStack SaaS | Multi-Location Gym Management Platform",
  description:
    "GymStack helps gym operators run billing, members, trainers, and analytics across every location from one dashboard.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${sora.variable}`}>
        <AuthProvider>
          <ToastProvider>
            <SessionProvider>{children}</SessionProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
