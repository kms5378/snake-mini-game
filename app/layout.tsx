import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Snake Mini Game",
  description: "A Vercel-ready Snake game with persistent Upstash Redis rankings."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
