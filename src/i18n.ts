import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en";
import pt from "./locales/pt";
import es from "./locales/es";
import it from "./locales/it";
import { resolveLangForClientBootstrap } from "@/lib/i18n-locale";

let initPromise: Promise<void> | null = null;

/**
 * Ensures i18n is initialized before any route renders (SSR + client).
 * Avoids top-level `await` in this module, which can race with the first paint on some serverless bundles.
 *
 * SSR note: this module exports a singleton. `src/start.ts` middleware always awaits
 * `changeLanguage` per request before route rendering, which is the correct ordering for typical
 * single-flight SSR. Avoid reading `i18n.language` during async gaps before that middleware runs.
 */
export function ensureI18nInitialized(): Promise<void> {
  if (i18n.isInitialized) return Promise.resolve();
  if (!initPromise) {
    // Real browser only: some runtimes expose a partial `document` without cookies (tests / polyfills).
    // SSR language is applied in `src/start.ts` middleware via `resolveLangForRequest` after init.
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
