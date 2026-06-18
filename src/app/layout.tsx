import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Display face: a warm optical serif used for the hero headline and big impact
// numerals — premium editorial contrast against the clean Inter UI.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "2nd Time Around — The UC campus marketplace",
    template: "%s · 2nd Time Around",
  },
  description:
    "The UC-only marketplace for buying, selling, donating, and finding lost items.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="font-sans min-h-screen">{children}</body>
    </html>
  );
}
