import { en } from "./en";
import { fr } from "./fr";
import { es } from "./es";
import { ar } from "./ar";
import { zh } from "./zh";
import { hi } from "./hi";
import { pt } from "./pt";
import { ru } from "./ru";
import { de } from "./de";
import { ja } from "./ja";
import { ko } from "./ko";
import { it } from "./it";
import { tr } from "./tr";
import { nl } from "./nl";
import { pl } from "./pl";
import { uk } from "./uk";
import { vi } from "./vi";
import { th } from "./th";
import { id } from "./id";
import { sv } from "./sv";
import type { Language } from "../lib/i18n";

export const translations = {
  en,
  fr,
  es,
  ar,
  zh,
  hi,
  pt,
  ru,
  de,
  ja,
  ko,
  it,
  tr,
  nl,
  pl,
  uk,
  vi,
  th,
  id,
  sv,
} as const;

export type TranslationKeys = typeof en;

// Helper function to get nested translation values
export function getTranslation(
  translations: TranslationKeys,
  key: string,
): string {
  return key.split(".").reduce((obj: any, k) => obj?.[k], translations) || key;
}
