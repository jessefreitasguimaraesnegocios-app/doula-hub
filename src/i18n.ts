import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en";
import pt from "./locales/pt";
import es from "./locales/es";
import it from "./locales/it";
import { resolveLangForClientBootstrap } from "@/lib/i18n-locale";

let initPromise: Promise<void> | null = null;

/**
 * Ensures i18n is initialized before any route renders.
 * Avoids top-level `await` in this module, which can race with the first paint on some runtimes.
 *
 * This module exports a singleton. The root route loader awaits initialization so routes
 * can safely use `useTranslation` on first paint.
 */
export function ensureI18nInitialized(): Promise<void> {
  if (i18n.isInitialized) return Promise.resolve();
  if (!initPromise) {
    // Real browser only: some runtimes expose a partial `document` without cookies (tests / polyfills).
    // Language is applied on the client via `I18nClientLanguageSync` and cookie detection.
    const isBrowser =
      typeof window !== "undefined" &&
      typeof document !== "undefined" &&
      typeof document.cookie === "string";
    const lng = isBrowser ? resolveLangForClientBootstrap() : "en";
    initPromise = i18n
      .use(initReactI18next)
      .init({
        resources: {
          en: { translation: en },
          pt: { translation: pt },
          es: { translation: es },
          it: { translation: it },
        },
        lng,
        fallbackLng: "en",
        supportedLngs: ["en", "pt", "es", "it"],
        interpolation: { escapeValue: false },
        react: { useSuspense: false },
      })
      .then(() => undefined);
  }
  return initPromise;
}

export default i18n;
