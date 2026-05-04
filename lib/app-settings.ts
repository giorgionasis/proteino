/**
 * App settings — server-side fetcher.
 *
 * Reads from `app_settings` table. Used by the layout to surface
 * maintenance mode banner and site identity.
 */

type SupabaseLike = { from: (table: string) => any };

export interface AppSettings {
  site_name: string;
  site_tagline: string;
  maintenance_mode: boolean;
  maintenance_message: string;
}

const DEFAULTS: AppSettings = {
  site_name: "Proteino",
  site_tagline: "Ανακάλυψε. Πρότεινε. Εμπνεύσου.",
  maintenance_mode: false,
  maintenance_message: "",
};

export async function fetchAppSettings(sb: SupabaseLike): Promise<AppSettings> {
  try {
    const { data } = await sb.from("app_settings").select("key, value");
    if (!Array.isArray(data)) return DEFAULTS;

    const map: Record<string, any> = {};
    for (const row of data) map[row.key] = row.value;

    return {
      site_name: typeof map.site_name === "string" ? map.site_name : DEFAULTS.site_name,
      site_tagline: typeof map.site_tagline === "string" ? map.site_tagline : DEFAULTS.site_tagline,
      maintenance_mode: map.maintenance_mode === true,
      maintenance_message: typeof map.maintenance_message === "string" ? map.maintenance_message : "",
    };
  } catch {
    return DEFAULTS;
  }
}
