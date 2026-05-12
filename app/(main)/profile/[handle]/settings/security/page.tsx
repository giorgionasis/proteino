import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SecuritySettings, type SecurityIdentity, type SecurityDevice } from "@/components/profile/settings/SecuritySettings";

export const dynamic = "force-dynamic";

/**
 * Server entry — pulls the real identity list + device history from
 * Supabase / the public `devices` table, and hands it to the client
 * component for rendering + interactions.
 *
 * Guests get redirected to login. Other users (visiting somebody
 * else's settings URL) bounce back to their own profile — nobody
 * should be able to see another user's security panel.
 */
export default async function SecurityPage({ params }: { params: { handle: string } }) {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await sb
    .from("users")
    .select("handle")
    .eq("id", user.id)
    .single();

  const myHandle = (profile as { handle?: string } | null)?.handle ?? null;
  if (!myHandle) redirect("/");
  if (params.handle !== myHandle) redirect(`/profile/${myHandle}/settings/security`);

  // Identities — populated by Supabase Auth. Each row carries provider
  // name + an identity_id we feed back into unlinkIdentity later.
  const identities: SecurityIdentity[] = (user.identities ?? []).map((i) => ({
    id:                 i.id ?? i.identity_id ?? "",
    provider:           i.provider,
    last_sign_in_at:    (i as any).last_sign_in_at ?? null,
    identity_data_email:
      typeof (i.identity_data as any)?.email === "string"
        ? ((i.identity_data as any).email as string)
        : null,
  }));

  // Device history — best-effort. Table is currently not auto-populated
  // by any auth hook (PROGRESS §3 follow-up); we still render whatever
  // is there in case admin / future login hook fills it.
  const { data: devicesData } = await sb
    .from("devices")
    .select("id, os, browser, region, device_image_type, login_at")
    .eq("user_id", user.id)
    .order("login_at", { ascending: false })
    .limit(20);

  const devices: SecurityDevice[] = ((devicesData ?? []) as any[]).map((d) => ({
    id:                 d.id,
    os:                 d.os,
    browser:            d.browser,
    region:             d.region,
    device_image_type:  d.device_image_type,
    login_at:           d.login_at,
  }));

  return (
    <SecuritySettings
      email={user.email ?? ""}
      lastUpdatedAt={user.updated_at ?? null}
      identities={identities}
      devices={devices}
    />
  );
}
