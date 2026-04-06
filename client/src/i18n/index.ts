import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import HttpBackend from "i18next-http-backend";

import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import ar from "./locales/ar.json";
import zh from "./locales/zh.json";
import hi from "./locales/hi.json";
import pt from "./locales/pt.json";
import ru from "./locales/ru.json";
import de from "./locales/de.json";
import ja from "./locales/ja.json";
import ko from "./locales/ko.json";
import it from "./locales/it.json";
import tr from "./locales/tr.json";
import nl from "./locales/nl.json";
import pl from "./locales/pl.json";
import uk from "./locales/uk.json";
import vi from "./locales/vi.json";
import th from "./locales/th.json";
import id from "./locales/id.json";
import sv from "./locales/sv.json";

export const resources = {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
  ar: { translation: ar },
  zh: { translation: zh },
  hi: { translation: hi },
  pt: { translation: pt },
  ru: { translation: ru },
  de: { translation: de },
  ja: { translation: ja },
  ko: { translation: ko },
  it: { translation: it },
  tr: { translation: tr },
  nl: { translation: nl },
  pl: { translation: pl },
  uk: { translation: uk },
  vi: { translation: vi },
  th: { translation: th },
  id: { translation: id },
  sv: { translation: sv },
};

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
    },
  });

export default i18n;

export const languages = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "hi", name: "हिन्दी", flag: "🇮🇳" },
  { code: "pt", name: "Português", flag: "🇧🇷" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "ko", name: "한국어", flag: "🇰🇷" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "tr", name: "Türkçe", flag: "🇹🇷" },
  { code: "nl", name: "Nederlands", flag: "🇳🇱" },
  { code: "pl", name: "Polski", flag: "🇵🇱" },
  { code: "uk", name: "Українська", flag: "🇺🇦" },
  { code: "vi", name: "Tiếng Việt", flag: "🇻🇳" },
  { code: "th", name: "ไทย", flag: "🇹🇭" },
  { code: "id", name: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "sv", name: "Svenska", flag: "🇸🇪" },
];
