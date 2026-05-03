import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EditProfileForm } from "@/components/profile/settings/EditProfileForm";

interface Props { params: { handle: string } }

export default async function EditProfilePage({ params }: Props) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return <EditProfileForm handle="" email="" displayName="" bio="" avatarUrl="" gender="" birthday="" region="" />;
  }

  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) redirect("/login");

  const meta = session.user.user_metadata ?? {};
  const fallbackAvatar = meta.avatar_url ?? meta.picture ?? "";
  const fallbackName   = meta.display_name ?? meta.full_name ?? meta.name ?? "";

  const { data } = await supabase
    .from("users")
    .select("handle, display_name, bio, avatar_url, gender, birthday, region")
    .eq("id", session.user.id)
    .single();

  const row = data as Record<string, string | null> | null;

  return (
    <EditProfileForm
      handle={row?.handle ?? ""}
      email={session.user.email ?? ""}
      displayName={row?.display_name ?? fallbackName}
      bio={row?.bio ?? ""}
      avatarUrl={row?.avatar_url ?? fallbackAvatar}
      gender={row?.gender ?? ""}
      birthday={row?.birthday ?? ""}
      region={row?.region ?? ""}
    />
  );
}
