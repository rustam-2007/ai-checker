import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Checker",
  description: "Check whether text may be AI-generated.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
