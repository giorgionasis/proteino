import { createClient } from "@/lib/supabase/client";

/**
 * Check if an email address exists in auth.users.
 * Requires this Supabase SQL function deployed once:
 *
 * CREATE OR REPLACE FUNCTION email_exists(email_param TEXT)
 * RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
 * BEGIN
 *   RETURN EXISTS (SELECT 1 FROM auth.users WHERE email = email_param);
 * END;
 * $$;
 * GRANT EXECUTE ON FUNCTION email_exists(TEXT) TO anon;
 *
 * Returns: true = exists, false = not found, null = RPC unavailable (graceful fallback)
 */
export async function checkEmailExists(email: string): Promise<boolean | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  try {
    const supabase = createClient();
    const { data, error } = await (supabase.rpc as any)("email_exists", { email_param: email });
    if (error) return null;
    return data as boolean;
  } catch {
    return null;
  }
}
