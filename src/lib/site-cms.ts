/**
 * Site-wide overrides edited in /admin (localStorage + JSON import/export).
 * For production multi-device editing, replace persistence with Supabase (or similar) + auth.
 */

export const SITE_CMS_STORAGE_KEY = "atb-site-cms-v1";
export const SITE_CMS_EVENT = "atb-site-cms";

/** Default Zoom scheduler used on Team when CMS field is empty. */
export const DEFAULT_TEAM_SCHEDULE_URL =
  "https://scheduler.zoom.us/jesse-freitas-p7edat/30-mins-with-jesse";

/** Keys for `siteImages` — URL (https…) replaces the bundled photo on the public site. */
export const SITE_IMAGE_KEYS = [
  "home_hero",
  "home_promise",
  "home_cta_newborn",
  "about_founder",
  "about_campus",
  "team_hero",
  "team_member_founder",
  "team_member_sofia",
  "team_member_elena",
  "team_member_mei",
  "shop_hero",
  "footer_logo",
] as const;

export type SiteImageKey = (typeof SITE_IMAGE_KEYS)[number];

/** Estado operacional (só no painel). */
export type ContractedDoulaStatus = "active" | "paused";

/** Registo no painel; com `visibleOnSite` pode aparecer em Equipa e Marcação. */
export type ContractedDoula = {
  id: string;
  name: string;
  phone: string;
  email: string;
  /** Ex.: "US$ 500 / mês" — texto livre */
  monthlyFeeDisplay: string;
  notes: string;
  photoUrl: string;
  /** Pausada: não entra no site nem na lista de marcação. */
  status: ContractedDoulaStatus;
  /** Se os clientes a veem em /team e podem escolhê-la em /booking. */
  visibleOnSite: boolean;
};

/** Normaliza JSON antigo ou parcial para o tipo actual. */
export function normalizeContractedDoula(raw: unknown): ContractedDoula | null {
  if (!raw || typeof raw !== "object") return null;
  const x = raw as Record<string, unknown>;
  if (typeof x.id !== "string" || !x.id.trim()) return null;
  const status: ContractedDoulaStatus = x.status === "paused" ? "paused" : "active";
  return {
    id: x.id.trim(),
    name: typeof x.name === "string" ? x.name : "",
    phone: typeof x.phone === "string" ? x.phone : "",
    email: typeof x.email === "string" ? x.email : "",
    monthlyFeeDisplay: typeof x.monthlyFeeDisplay === "string" ? x.monthlyFeeDisplay : "",
    notes: typeof x.notes === "string" ? x.notes : "",
    photoUrl: typeof x.photoUrl === "string" ? x.photoUrl : "",
    status,
    visibleOnSite: x.visibleOnSite === true,
  };
}

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
  /** Full URL per slot; empty = keep default image from the site code. */
  siteImages: Partial<Record<SiteImageKey, string>>;
  /** Doulas contratadas: gestão no admin; as com `visibleOnSite` entram em Equipa/Marcação. */
  contractedDoulas: ContractedDoula[];
  /** Overlay «em breve» na página Loja (desliga no admin quando abrir). */
  shopComingSoonEnabled: boolean;
  /** Vazio = usar texto das traduções (por idioma). */
  shopComingSoonTitle: string;
  /** Vazio = usar texto das traduções. Pode usar quebras de linha. */
  shopComingSoonMessage: string;
  /** Nome amigável no remetente dos e-mails automáticos (vazio = usar SMTP_FROM_NAME no servidor). */
  emailFromName: string;
  /** Enviar e-mail de confirmação ao concluir o fluxo de marcação (requer SMTP no servidor). */
  emailAutomationBooking: boolean;
  /** Enviar cópia da mensagem do formulário de contactos para a caixa do site (SMTP_NOTIFY_TO ou SMTP_USER). */
  emailAutomationContact: boolean;
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
  siteImages: {},
  contractedDoulas: [],
  shopComingSoonEnabled: true,
  shopComingSoonTitle: "",
  shopComingSoonMessage: "",
  emailFromName: "",
  emailAutomationBooking: true,
  emailAutomationContact: true,
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
  const si = p.siteImages;
  const siteImages: Partial<Record<SiteImageKey, string>> = {
    ...base.siteImages,
    ...(si && typeof si === "object" && !Array.isArray(si)
      ? (si as Partial<Record<SiteImageKey, string>>)
      : {}),
  };
  const cd = p.contractedDoulas;
  const contractedDoulas: ContractedDoula[] = Array.isArray(cd)
    ? (cd as unknown[])
        .map((x) => normalizeContractedDoula(x))
        .filter((x): x is ContractedDoula => x !== null)
    : base.contractedDoulas;
  const shopComingSoonEnabled =
    typeof p.shopComingSoonEnabled === "boolean"
      ? p.shopComingSoonEnabled
      : base.shopComingSoonEnabled;
  const shopComingSoonTitle =
    typeof p.shopComingSoonTitle === "string" ? p.shopComingSoonTitle : base.shopComingSoonTitle;
  const shopComingSoonMessage =
    typeof p.shopComingSoonMessage === "string"
      ? p.shopComingSoonMessage
      : base.shopComingSoonMessage;
  const emailFromName = typeof p.emailFromName === "string" ? p.emailFromName : base.emailFromName;
  const emailAutomationBooking =
    typeof p.emailAutomationBooking === "boolean"
      ? p.emailAutomationBooking
      : base.emailAutomationBooking;
  const emailAutomationContact =
    typeof p.emailAutomationContact === "boolean"
      ? p.emailAutomationContact
      : base.emailAutomationContact;
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
    siteImages,
    contractedDoulas,
    shopComingSoonEnabled,
    shopComingSoonTitle,
    shopComingSoonMessage,
    emailFromName,
    emailAutomationBooking,
    emailAutomationContact,
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

/** Resolved image URL for a CMS slot (bundled path or remote URL). */
export function pickSiteImageUrl(cms: SiteCmsV1, key: SiteImageKey, fallback: string): string {
  const u = cms.siteImages?.[key]?.trim();
  return u || fallback;
}

/** Whether a URL points at a common browser-playable video file. */
export function isVideoAssetUrl(url: string): boolean {
  const base = (url.split("?")[0] ?? "").toLowerCase();
  return /\.(mp4|webm|ogg)$/i.test(base);
}

export function applySiteCmsTheme(cms: SiteCmsV1) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const { primary, primaryForeground } = cms.theme;
  if (primary.trim()) root.style.setProperty("--primary", primary.trim());
  else root.style.removeProperty("--primary");
  if (primaryForeground.trim())
    root.style.setProperty("--primary-foreground", primaryForeground.trim());
  else root.style.removeProperty("--primary-foreground");
}
