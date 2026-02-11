import "./globals.css";
import { SessionProvider } from "./components/session-provider";
import { AuthProvider } from "../src/providers/AuthProvider";
import { ToastProvider } from "../src/components/toast/ToastProvider";

export const metadata = {
  title: "GymStack SaaS",
  description: "Operate multi-location gyms with unified dashboards and billing.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ToastProvider>
            <SessionProvider>{children}</SessionProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
