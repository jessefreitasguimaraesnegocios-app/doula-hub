import { useEffect, useRef } from "react";
import { mergeSiteCmsFromRemote, setSiteCmsToStorage, applySiteCmsTheme } from "@/lib/site-cms";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { fetchSiteSettingsPayload } from "@/lib/supabase/queries";

/**
 * On first load, pull `site_settings` from Supabase into localStorage so the rest of the app
 * keeps using the existing CMS hook without per-route fetching.
 */
export function SupabaseSiteBootstrap() {
  const ran = useRef(false);

  useEffect(() => {
    if (!isSupabaseConfigured() || ran.current) return;
    ran.current = true;
    const client = getSupabaseBrowserClient();
    if (!client) return;

    void (async () => {
      try {
        const payload = await fetchSiteSettingsPayload();
        if (payload === null) return;
        const merged = mergeSiteCmsFromRemote(payload);
        setSiteCmsToStorage(merged);
        applySiteCmsTheme(merged);
      } catch (e) {
        console.error("[SupabaseSiteBootstrap] failed to merge site_settings", e);
      }
    })();
  }, []);

  return null;
}
