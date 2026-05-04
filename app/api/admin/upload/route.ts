import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

const MAX_BYTES = 5 * 1024 * 1024;   // 5 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];

// POST /api/admin/upload
// multipart/form-data: file=<File>, prefix=<string>
//
// Uploads to Supabase Storage `media` bucket under {prefix}/{uuid}-{slugified-name}
// Returns: { url: string, path: string }
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file");
  const prefixRaw = formData.get("prefix");
  const prefix = typeof prefixRaw === "string" ? prefixRaw.trim() : "";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json(
      { error: `Μη υποστηριζόμενος τύπος (${file.type}). Δεκτά: JPG, PNG, WebP, GIF, SVG.` },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Πολύ μεγάλο αρχείο (${(file.size / 1024 / 1024).toFixed(1)}MB). Όριο 5MB.` },
      { status: 400 }
    );
  }
  if (!/^[a-z0-9_-]+$/i.test(prefix)) {
    return NextResponse.json(
      { error: "Invalid prefix. Use a-z, 0-9, _ or -." },
      { status: 400 }
    );
  }

  const safePrefix = prefix.toLowerCase();
  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const baseName = file.name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "file";
  const id = crypto.randomUUID();
  const path = `${safePrefix}/${id}-${baseName}.${ext}`;

  const sb = createAdminClient();
  const { error: uploadError } = await sb.storage
    .from("media")
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: pub } = sb.storage.from("media").getPublicUrl(path);

  return NextResponse.json({
    url: pub.publicUrl,
    path,
  });
}

// DELETE /api/admin/upload?path=collections/uuid-foo.jpg
// Removes the object from storage. Used when admin clears an image.
export async function DELETE(req: NextRequest) {
  const url = new URL(req.url);
  const path = url.searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "path required" }, { status: 400 });
  }

  const sb = createAdminClient();
  const { error } = await sb.storage.from("media").remove([path]);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
