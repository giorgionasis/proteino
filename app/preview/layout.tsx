import "../globals.css";
import { PreviewScrollListener } from "@/components/preview/PreviewScrollListener";

/**
 * Iframe-safe layout for the admin live preview.
 *
 * Sits OUTSIDE app/(main)/ so it doesn't inherit the global Header /
 * BottomNav / FAB chrome. The admin iframes pages under /preview/ and
 * sees a clean mobile-frame render.
 *
 * No bottom nav, no header, no FAB — just the page body. Safe-area
 * insets and globals.css still apply since this layout imports the
 * stylesheet.
 *
 * `PreviewScrollListener` adds postMessage listening so /admin/layout
 * can scroll this iframe to a specific section when admin clicks a row.
 */
export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white min-h-screen">
      <PreviewScrollListener />
      {children}
    </div>
  );
}
