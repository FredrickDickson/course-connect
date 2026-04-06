// Internationalization configuration and utilities
export type Language =
  | "en"
  | "fr"
  | "es"
  | "ar"
  | "zh"
  | "hi"
  | "pt"
  | "ru"
  | "de"
  | "ja"
  | "ko"
  | "it"
  | "tr"
  | "nl"
  | "pl"
  | "uk"
  | "vi"
  | "th"
  | "id"
  | "sv";

export interface LanguageInfo {
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
  rtl?: boolean;
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: "en", name: "English", nativeName: "English", flag: "🇬🇧" },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
  { code: "ar", name: "Arabic", nativeName: "العربية", flag: "🇸�", rtl: true },
  { code: "zh", name: "Chinese", nativeName: "中文", flag: "🇨🇳" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳" },
  { code: "pt", name: "Portuguese", nativeName: "Português", flag: "🇧🇷" },
  { code: "ru", name: "Russian", nativeName: "Русский", flag: "🇷🇺" },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪" },
  { code: "ja", name: "Japanese", nativeName: "日本語", flag: "🇯🇵" },
  { code: "ko", name: "Korean", nativeName: "한국어", flag: "🇰🇷" },
  { code: "it", name: "Italian", nativeName: "Italiano", flag: "🇮🇹" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe", flag: "🇹🇷" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands", flag: "🇳🇱" },
  { code: "pl", name: "Polish", nativeName: "Polski", flag: "🇵🇱" },
  { code: "uk", name: "Ukrainian", nativeName: "Українська", flag: "🇺🇦" },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt", flag: "🇻🇳" },
  { code: "th", name: "Thai", nativeName: "ไทย", flag: "🇹🇭" },
  {
    code: "id",
    name: "Indonesian",
    nativeName: "Bahasa Indonesia",
    flag: "🇮🇩",
  },
  { code: "sv", name: "Swedish", nativeName: "Svenska", flag: "🇸🇪" },
];

export const DEFAULT_LANGUAGE: Language = "en";

// Get language from localStorage or browser preference
export function getInitialLanguage(): Language {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;

  // Try localStorage first
  const stored = localStorage.getItem("cima-language") as Language;
  if (stored && SUPPORTED_LANGUAGES.find((lang) => lang.code === stored)) {
    return stored;
  }

  // Try browser language
  const browserLang = navigator.language.split("-")[0] as Language;
  if (SUPPORTED_LANGUAGES.find((lang) => lang.code === browserLang)) {
    return browserLang;
  }

  return DEFAULT_LANGUAGE;
}

// Save language preference
export function saveLanguagePreference(language: Language): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("cima-language", language);
}

// Get language info by code
export function getLanguageInfo(code: Language): LanguageInfo {
  return (
    SUPPORTED_LANGUAGES.find((lang) => lang.code === code) ||
    SUPPORTED_LANGUAGES[0]
  );
}
