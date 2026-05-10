import { useLayoutEffect } from "react";
import { useTranslation } from "react-i18next";

import { isSupportedLang, setLangCookie } from "@/lib/i18n-locale";

/**
 * After hydration, apply `localStorage` preference if it differs from the cookie/navigator
 * snapshot used for the first paint (so old sessions still respect the saved language).
 */
export function I18nClientLanguageSync() {
  const { i18n } = useTranslation();

  useLayoutEffect(() => {
    try {
      const stored = localStorage.getItem("i18nextLng");
      if (stored && isSupportedLang(stored) && stored !== i18n.resolvedLanguage) {
        void i18n.changeLanguage(stored);
        setLangCookie(stored);
      }
    } catch {
      /* localStorage blocked */
    }
  }, [i18n]);

  return null;
}
