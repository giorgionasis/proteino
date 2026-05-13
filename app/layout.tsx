import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://proteino.gr").replace(/\/$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default:  "Proteino",
    template: "%s — Proteino",
  },
  description: "Κοινοτικές προτάσεις για βιβλία, ταινίες, σειρές, συνταγές, φαγητό, μπαρ, ξενοδοχεία, θέατρο και εκδηλώσεις.",
  applicationName: "Proteino",
  openGraph: {
    type:        "website",
    siteName:    "Proteino",
    locale:      "el_GR",
    url:         SITE_URL,
    title:       "Proteino",
    description: "Κοινοτικές προτάσεις για βιβλία, ταινίες, σειρές, συνταγές, φαγητό, μπαρ, ξενοδοχεία, θέατρο και εκδηλώσεις.",
  },
  twitter: {
    card:        "summary_large_image",
    title:       "Proteino",
    description: "Κοινοτικές προτάσεις για βιβλία, ταινίες, σειρές, συνταγές, φαγητό, μπαρ, ξενοδοχεία, θέατρο και εκδηλώσεις.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#D85A30",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="el">
      <body>{children}</body>
    </html>
  );
}
