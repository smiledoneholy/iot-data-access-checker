import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IoT Data Access Checker",
  description: "Technical readiness analysis for IoT OpenAPI documentation.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
