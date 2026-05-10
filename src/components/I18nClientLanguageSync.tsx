import { useLayoutEffect } from "react";
import { useTranslation } from "react-i18next";

const SUPPORTED = new Set(["en", "pt", "es", "it"]);

/**
 * Keeps first client render aligned with SSR (default "en"), then applies
 * localStorage / browser language so we avoid React hydration mismatches.
 */
export function I18nClientLanguageSync() {
  const { i18n } = useTranslation();

  useLayoutEffect(() => {
    try {
      const stored = localStorage.getItem("i18nextLng");
      if (stored && SUPPORTED.has(stored) && stored !== i18n.resolvedLanguage) {
        void i18n.changeLanguage(stored);
        return;
      }
      if (!stored) {
        const nav = navigator.language?.toLowerCase().slice(0, 2);
        if (nav && SUPPORTED.has(nav) && nav !== i18n.resolvedLanguage) {
          void i18n.changeLanguage(nav);
        }
      }
    } catch {
      /* localStorage blocked */
    }
  }, [i18n]);

  return null;
}
