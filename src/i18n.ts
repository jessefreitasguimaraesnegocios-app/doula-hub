import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en";
import pt from "./locales/pt";
import es from "./locales/es";
import it from "./locales/it";
import { resolveLangForClientBootstrap } from "@/lib/i18n-locale";

if (!i18n.isInitialized) {
  const lng = typeof document !== "undefined" ? resolveLangForClientBootstrap() : "en";
  await i18n.use(initReactI18next).init({
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
  });
}

export default i18n;
