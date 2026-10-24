import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Make sure a signed-in auth user has a public.users row.
 *
 * The row used to be created only in /auth/callback, so it was silently
 * missing when (a) the chosen handle was already taken — the insert hit
 * the unique constraint, e.g. against the 626 migrated K2 handles — or
 * (b) the confirmation link was opened on another device, where the PKCE
 * code exchange fails before the callback reaches the insert. Those users
 * were logged in with no profile: /you showed the guest page and
 * onboarding never started.
 *
 * Called from the callback and from the (main) layout, so any page visit
 * repairs it. Returns the profile's handle. Matches an existing profile
 * by id, then by email (OAuth can mint a new auth id for a known email).
 */
export async function ensureProfile(user: User): Promise<{ id: string; handle: string } | null> {
  const admin = createAdminClient();
  const db = admin.from("users") as any;

  const { data: byId } = await db.select("id, handle, avatar_url").eq("id", user.id).maybeSingle();
  const meta = user.user_metadata ?? {};
  const photo: string | null = meta.avatar_url ?? meta.picture ?? null;

  if (byId) {
    if (photo && !byId.avatar_url) await db.update({ avatar_url: photo }).eq("id", user.id);
    return { id: byId.id, handle: byId.handle };
  }

  if (user.email) {
    const { data: byEmail } = await (admin.from("users") as any)
      .select("id, handle, avatar_url")
      .eq("email", user.email)
      .maybeSingle();
    if (byEmail) {
      if (photo && !byEmail.avatar_url) {
        await (admin.from("users") as any).update({ avatar_url: photo }).eq("id", byEmail.id);
      }
      return { id: byEmail.id, handle: byEmail.handle };
    }
  }

  const base = normalizeHandle(
    meta.handle ?? user.email?.split("@")[0] ?? `user_${user.id.slice(0, 8)}`,
  );
  const display = meta.display_name ?? meta.full_name ?? meta.name ?? base;

  for (let attempt = 0; attempt < 6; attempt++) {
    const handle = attempt === 0 ? base : `${base.slice(0, 25)}${randomDigits(attempt < 3 ? 2 : 4)}`;
    const { error } = await (admin.from("users") as any).insert({
      id:               user.id,
      email:            user.email!,
      handle,
      display_name:     display,
      avatar_url:       photo,
      role:             "user",
      points:           0,
      level:            1,
      suggestion_count: 0,
      rating_count:     0,
      is_private:       false,
      is_verified:      false,
    });
    if (!error) return { id: user.id, handle };
    // 23505 = unique violation. Handle taken → retry with a suffix; a
    // concurrent request may also have just created the row → re-read.
    if (error.code !== "23505") {
      console.error("[ensureProfile] insert failed:", error.message);
      return null;
    }
    const { data: raced } = await (admin.from("users") as any)
      .select("id, handle").eq("id", user.id).maybeSingle();
    if (raced) return { id: raced.id, handle: raced.handle };
  }
  console.error("[ensureProfile] no free handle for", base);
  return null;
}

function normalizeHandle(raw: string): string {
  const h = String(raw).toLowerCase().replace(/[^a-z0-9_.]/g, "_").replace(/^[._]+|[._]+$/g, "").slice(0, 30);
  return h.length >= 3 ? h : `user_${h}`.slice(0, 30);
}

function randomDigits(n: number): string {
  return String(Math.floor(Math.random() * 10 ** n)).padStart(n, "0");
}
