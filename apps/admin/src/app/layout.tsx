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

const fallbackAdminUrl = "http://localhost:3001";
const configuredAdminUrl = process.env.ADMIN_APP_URL ?? fallbackAdminUrl;

export const metadata: Metadata = {
  metadataBase: new URL(configuredAdminUrl, fallbackAdminUrl),
  title: {
    default: "Fruition Admin",
    template: "%s | Fruition Admin",
  },
  description: "Private Fruition idea intelligence workspace.",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
