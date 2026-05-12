import { useLayoutEffect } from "react";
import { useTranslation } from "react-i18next";

import { isSupportedLang, normalizeHtmlLang, setLangCookie } from "@/lib/i18n-locale";

/**
 * After hydration, apply `localStorage` preference if it differs from the cookie/navigator
 * snapshot used for the first paint (so old sessions still respect the saved language).
 *
 * Keeps `<html lang>` in sync on SPA navigations (the shell may not re-render on every route change).
 */
export function I18nClientLanguageSync() {
  const { i18n } = useTranslation();

  useLayoutEffect(() => {
    const applyDomLang = (lng: string) => {
      if (typeof document === "undefined") return;
      document.documentElement.lang = normalizeHtmlLang(lng);
    };

    applyDomLang(i18n.resolvedLanguage ?? i18n.language ?? "en");
    const onChanged = (lng: string) => applyDomLang(lng);
    i18n.on("languageChanged", onChanged);
    return () => {
      i18n.off("languageChanged", onChanged);
    };
  }, [i18n]);

  useLayoutEffect(() => {
    try {
      const stored = localStorage.getItem("i18nextLng");
      if (stored && isSupportedLang(stored) && stored !== i18n.resolvedLanguage) {
        void i18n.changeLanguage(stored).then(() => {
          setLangCookie(stored);
        });
      }
    } catch {
      /* localStorage blocked */
    }
  }, [i18n]);

  return null;
}
