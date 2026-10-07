import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MailPort",
  description: "Turn SMTP into an HTTP API. Manage multiple senders, each with its own endpoint and key.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
