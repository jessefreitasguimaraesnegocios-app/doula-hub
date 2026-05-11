export const I18N_LANG_COOKIE = "i18nextLng";

export const SUPPORTED_LANGS = ["en", "pt", "es", "it"] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

const supported = new Set<string>(SUPPORTED_LANGS);

export function isSupportedLang(code: string | undefined | null): code is SupportedLang {
  return Boolean(code && supported.has(code));
}

/** Parse `i18nextLng` from a Cookie header (SSR or client `document.cookie`). */
export function langFromCookieHeader(cookie: string | null | undefined): SupportedLang | null {
  if (!cookie?.trim()) return null;
  const m = cookie.match(new RegExp(`(?:^|;\\s*)${I18N_LANG_COOKIE}=([^;]+)`));
  const raw = m?.[1]?.trim();
  if (!raw) return null;
  try {
    const code = decodeURIComponent(raw).toLowerCase().slice(0, 2);
    return isSupportedLang(code) ? code : null;
  } catch {
    return null;
  }
}

/** First language tag in Accept-Language that we support (base 2-letter code). */
export function langFromAcceptLanguageHeader(
  header: string | null | undefined,
): SupportedLang | null {
  if (!header?.trim()) return null;
  const parts = header.split(",");
  for (const part of parts) {
    const tag = part.split(";")[0]?.trim().toLowerCase();
    if (!tag) continue;
    const base = tag.slice(0, 2);
    if (isSupportedLang(base)) return base;
  }
  return null;
}

export function resolveLangForRequest(request: Request): SupportedLang {
  const cookie = langFromCookieHeader(request.headers.get("cookie"));
  if (cookie) return cookie;
  const accept = langFromAcceptLanguageHeader(request.headers.get("accept-language"));
  return accept ?? "en";
}

/**
 * Language for the very first i18n init in the browser.
 * Must mirror {@link resolveLangForRequest} priority (cookie → browser language), not localStorage,
 * so the first client render matches SSR HTML and React can hydrate.
 */
export function resolveLangForClientBootstrap(): SupportedLang {
  if (typeof document === "undefined") return "en";
  const cookie = langFromCookieHeader(document.cookie);
  if (cookie) return cookie;
  const nav = typeof navigator !== "undefined" ? navigator.language?.toLowerCase().slice(0, 2) : "";
  if (isSupportedLang(nav)) return nav;
  return "en";
}

export function setLangCookie(code: SupportedLang) {
  if (typeof document === "undefined") return;
  document.cookie = `${I18N_LANG_COOKIE}=${encodeURIComponent(code)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}
