import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
