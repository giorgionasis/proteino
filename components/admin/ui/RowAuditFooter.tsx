"use client";

import type { AdminUserMap } from "@/lib/admin/audit";

/**
 * Small inline meta line for admin manager rows:
 *
 *     Edited 5m ago by @georgenasis
 *
 * Renders `null` when there's no `modified_at` (row was never edited
 * since migration 040 was applied) so it's safe to drop into any row's
 * meta slot without conditional logic at the call site.
 *
 * The user map is built server-side (see `resolveAdminUserMap` in
 * `lib/admin/audit.ts`) so we don't fire a network round-trip per row.
 */
export function RowAuditFooter({
  modifiedAt,
  modifiedById,
  userMap,
  prefix = "Edited",
}: {
  modifiedAt?: string | null;
  modifiedById?: string | null;
  userMap?: AdminUserMap;
  prefix?: string;
}) {
  if (!modifiedAt) return null;

  const user = modifiedById && userMap ? userMap[modifiedById] : null;
  const userLabel = user
    ? user.handle ? `@${user.handle}` : user.display_name ?? "admin"
    : null;

  return (
    <span className="text-[11px] text-zinc-400">
      {prefix} {relativeTime(modifiedAt)}
      {userLabel ? <> by {userLabel}</> : null}
    </span>
  );
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
