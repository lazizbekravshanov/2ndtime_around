import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const SITE_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "2nd Time Around — The UC campus marketplace",
    template: "%s · 2nd Time Around",
  },
  description:
    "The UC-only marketplace for buying, selling, donating, and finding lost items.",
  openGraph: {
    siteName: "2nd Time Around",
    type: "website",
    title: "2nd Time Around — The UC campus marketplace",
    description:
      "Buy, sell, donate, and recover lost items. UC students only, all in one place.",
  },
  twitter: {
    card: "summary",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans min-h-dvh">{children}</body>
    </html>
  );
}
