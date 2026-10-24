import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

/**
 * robots.ts — App Router convention for /robots.txt.
 *
 * Allows everything except admin / api / auth-only / preview routes.
 * Points crawlers at the sitemap so they discover all detail pages.
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = SITE_URL;
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
