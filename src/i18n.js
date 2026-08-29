import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import enTranslation from "./locales/en/translation.json";
import swTranslation from "./locales/sw/translation.json";

const resources = {
  en: { translation: enTranslation },
  sw: { translation: swTranslation },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    supportedLngs: ["en", "sw"],
    defaultNS: "translation",
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "soma_language",
    },
    react: {
      useSuspense: false,
    },
  });

// Keep <html lang> in sync + SEO hreflang
i18n.on("languageChanged", (lng) => {
  document.documentElement.lang = lng;
  // Update og:locale meta if present
  const ogLocale = document.querySelector('meta[property="og:locale"]');
  if (ogLocale) ogLocale.setAttribute("content", lng === "sw" ? "sw_KE" : "en_KE");
});

document.documentElement.lang = i18n.language?.split("-")[0] || "en";

export default i18n;
