import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fallbackSiteUrl = "http://localhost:3000";
const configuredSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? fallbackSiteUrl;
const metadataBase = new URL(configuredSiteUrl, fallbackSiteUrl);

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: "Fruition Venture Studio",
    template: "%s | Fruition Venture Studio",
  },
  description:
    "Fruition partners with founders and domain experts to turn promising concepts into enduring software companies.",
  openGraph: {
    title: "Fruition Venture Studio",
    description: "From concept to company.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
