/**
 * Site-wide overrides edited in /admin (localStorage + JSON import/export).
 * For production multi-device editing, replace persistence with Supabase (or similar) + auth.
 */

export const SITE_CMS_STORAGE_KEY = "atb-site-cms-v1";
export const SITE_CMS_EVENT = "atb-site-cms";

/** Default Zoom scheduler used on Team when CMS field is empty. */
export const DEFAULT_TEAM_SCHEDULE_URL =
  "https://scheduler.zoom.us/jesse-freitas-p7edat/30-mins-with-jesse";

export type SiteCmsV1 = {
  version: 1;
  contactEmail: string;
  contactPhoneDisplay: string;
  contactPhoneHref: string;
  addressLine: string;
  instagramUrl: string;
  instagramHandle: string;
  /** Empty string = keep i18n price for that package. */
  servicesPrices: {
    birthUsd: string;
    postpartumUsd: string;
    lactationUsd: string;
  };
  theme: {
    /** oklch() or any valid CSS color for :root --primary */
    primary: string;
    primaryForeground: string;
  };
  teamDefaultScheduleUrl: string;
};

export const DEFAULT_SITE_CMS: SiteCmsV1 = {
  version: 1,
  contactEmail: "Doula@AllThingsBabies.com",
  contactPhoneDisplay: "+1 (323) 640-6640",
  contactPhoneHref: "+13236406640",
  addressLine: "Downtown Culver City, CA",
  instagramUrl: "https://www.instagram.com/allthingsbabiesllc/",
  instagramHandle: "@allthingsbabiesllc",
  servicesPrices: {
    birthUsd: "",
    postpartumUsd: "",
    lactationUsd: "",
  },
  theme: {
    primary: "",
    primaryForeground: "",
  },
  teamDefaultScheduleUrl: "",
};

/** Merge a remote JSON payload (e.g. Supabase `site_settings.payload`) into defaults. */
export function mergeSiteCmsFromRemote(partial: unknown): SiteCmsV1 {
  return mergePartial({ ...DEFAULT_SITE_CMS }, partial);
}

function mergePartial(base: SiteCmsV1, partial: unknown): SiteCmsV1 {
  if (!partial || typeof partial !== "object") return base;
  const p = partial as Record<string, unknown>;
  const sp = (p.servicesPrices as Record<string, unknown> | undefined) ?? {};
  const th = (p.theme as Record<string, unknown> | undefined) ?? {};
  return {
    ...base,
    ...p,
    servicesPrices: {
      ...base.servicesPrices,
      ...(typeof sp === "object" && sp ? sp : {}),
    },
    theme: {
      ...base.theme,
      ...(typeof th === "object" && th ? th : {}),
    },
  } as SiteCmsV1;
}

export function parseSiteCmsJson(raw: string | null): SiteCmsV1 {
  if (!raw?.trim()) return { ...DEFAULT_SITE_CMS };
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) return { ...DEFAULT_SITE_CMS };
    const o = parsed as Record<string, unknown>;
    if (o.version !== 1) return { ...DEFAULT_SITE_CMS };
    return mergePartial({ ...DEFAULT_SITE_CMS }, parsed);
  } catch {
    return { ...DEFAULT_SITE_CMS };
  }
}

export function getSiteCmsFromStorage(): SiteCmsV1 {
  if (typeof window === "undefined") return { ...DEFAULT_SITE_CMS };
  return parseSiteCmsJson(localStorage.getItem(SITE_CMS_STORAGE_KEY));
}

export function setSiteCmsToStorage(data: SiteCmsV1) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SITE_CMS_STORAGE_KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent(SITE_CMS_EVENT));
}

/** USD price overrides for /services + booking (empty = use i18n). */
export function servicePriceUsdOverride(cms: SiteCmsV1, pkg: string): string | null {
  if (pkg === "birth") return cms.servicesPrices.birthUsd.trim() || null;
  if (pkg === "postpartum") return cms.servicesPrices.postpartumUsd.trim() || null;
  if (pkg === "lactation") return cms.servicesPrices.lactationUsd.trim() || null;
  return null;
}

export function applySiteCmsTheme(cms: SiteCmsV1) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const { primary, primaryForeground } = cms.theme;
  if (primary.trim()) root.style.setProperty("--primary", primary.trim());
  else root.style.removeProperty("--primary");
  if (primaryForeground.trim()) root.style.setProperty("--primary-foreground", primaryForeground.trim());
  else root.style.removeProperty("--primary-foreground");
}
