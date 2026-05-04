/**
 * Site-wide maintenance banner. Renders only when admin sets
 * `maintenance_mode = true` in app_settings. Returns null otherwise.
 */

export function MaintenanceBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="bg-amber-100 border-b border-amber-300 text-amber-900 text-sm font-medium px-4 py-2 text-center">
      <span className="inline-flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 9v4M12 17h.01" />
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
        {message}
      </span>
    </div>
  );
}
