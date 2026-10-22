import { UsersTable } from "@/components/admin/UsersTable";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAdminUsers } from "@/lib/admin/users-list";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  // Default scope (Recent Registered, page 1, no search). The table's
  // skip-flag keeps the seeded result on first mount; sort / search /
  // pagination changes refetch through GET /api/admin/users.
  const { rows, total } = await fetchAdminUsers(createAdminClient(), {});

  return <UsersTable initialRows={rows} initialTotal={total} />;
}
