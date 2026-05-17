import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ActivityEditor, type ActivityFormData } from "@/components/admin/ActivityEditor";

export const dynamic = "force-dynamic";

export default async function EditActivityPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("activities")
    .select("*, activity_types(id, category_id)")
    .eq("id", params.id)
    .single();

  if (error || !data) notFound();
  const row = data as any;

  const initial: Partial<ActivityFormData> & { id: string } = {
    id: row.id,
    type_id: row.type_id,
    category_id: row.activity_types?.category_id ?? "",
    name: row.name ?? "",
    description: row.description ?? "",
    address: row.address ?? "",
    lat: row.lat != null ? String(row.lat) : "",
    lng: row.lng != null ? String(row.lng) : "",
    website_url: row.website_url ?? "",
    facebook_url: row.facebook_url ?? "",
    instagram_url: row.instagram_url ?? "",
    phone: row.phone ?? "",
    image_url: row.image_url ?? "",
    is_published: row.is_published ?? true,
  };

  return <ActivityEditor initial={initial} />;
}
