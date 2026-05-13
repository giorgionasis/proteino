import type { MetadataRoute } from "next";

/**
 * robots.ts — App Router convention for /robots.txt.
 *
 * Allows everything except admin / api / auth-only / preview routes.
 * Points crawlers at the sitemap so they discover all detail pages.
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://proteino.gr").replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow:     "/",
        disallow:  [
          "/admin",
          "/admin/",
          "/api/",
          "/auth/",
          "/preview/",
          "/onboarding",
          "/settings",
          "/forgot-password",
          "/reset-password",
          "/verify-code",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host:    siteUrl,
  };
}
