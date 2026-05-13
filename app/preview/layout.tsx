import "../globals.css";

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
 */
export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white min-h-screen">
      {children}
    </div>
  );
}
