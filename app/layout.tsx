import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
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
  // No explicit robots: index/follow is the default, and an explicit
  // "index, follow" here sat next to the "noindex" Next injects on
  // not-found pages, sending crawlers contradictory signals.
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#FE6F5E",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="el">
      <body>
        {children}
        {/* Cookieless page-view analytics (no consent banner needed).
            Collects once Web Analytics is enabled in the Vercel project. */}
        <Analytics />
      </body>
    </html>
  );
}
