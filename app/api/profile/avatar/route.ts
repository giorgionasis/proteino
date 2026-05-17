import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

/**
 * POST /api/profile/avatar
 *
 * User-auth avatar upload. The admin upload endpoint is admin-only
 * (no auth gate beyond service-role); this one accepts the user's
 * Supabase session and writes under `avatars/{user_id}/...`. After
 * the upload succeeds, `users.avatar_url` is updated atomically so
 * the new avatar shows everywhere immediately (header, popups,
 * carousel overlays).
 *
 * Storage path convention: `avatars/{user_id}/{uuid}.{ext}` — each
 * user can only write under their own folder (enforce via storage
 * policy at the bucket level, but we also key the path on user_id
 * so admin operations can identify ownership at a glance).
 *
 * Body: multipart/form-data with `file=<File>`. Returns `{ url }`.
 */
export async function POST(req: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json(
      { error: "Δεκτά JPG, PNG, ή WebP." },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Πολύ μεγάλο αρχείο (${(file.size / 1024 / 1024).toFixed(1)}MB). Όριο 4MB.` },
      { status: 400 },
    );
  }

  const ext = (file.name.split(".").pop() || "bin")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const id = crypto.randomUUID();
  const path = `avatars/${user.id}/${id}.${ext}`;

  // Use the admin client for storage write — RLS on the media bucket
  // would otherwise require per-user storage policies we don't have.
  // The user_id segment in the path is the access boundary.
  const admin = createAdminClient();
  const { error: uploadErr } = await admin.storage
    .from("media")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });
  }

  const { data: pub } = admin.storage.from("media").getPublicUrl(path);
  const avatarUrl = pub.publicUrl;

  // Persist on the users row. Also fetch the previous avatar so we can
  // clean it up from storage (best-effort; failure here doesn't fail
  // the response since the new avatar is already live).
  const { data: prev } = await admin
    .from("users")
    .select("avatar_url")
    .eq("id", user.id)
    .maybeSingle<{ avatar_url: string | null }>();

  const { error: updateErr } = await (admin.from("users") as any)
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id);

  if (updateErr) {
    // Roll back the upload so we don't orphan a file the user can't reach.
    await admin.storage.from("media").remove([path]);
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Best-effort cleanup of the previous avatar IF it lived in our
  // storage (skips Google/OAuth avatars whose URL is external).
  const prevUrl = prev?.avatar_url;
  if (prevUrl && prevUrl.includes(`/media/avatars/${user.id}/`)) {
    const prevPath = prevUrl.split(`/media/`)[1];
    if (prevPath) await admin.storage.from("media").remove([prevPath]);
  }

  return NextResponse.json({ url: avatarUrl });
}
