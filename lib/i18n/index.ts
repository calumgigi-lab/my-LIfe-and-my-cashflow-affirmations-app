import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";
import en from "./locales/en.json";

const STORAGE_KEY = "app_language";

const deviceLanguage = getLocales()?.[0]?.languageCode ?? "en";
const validCodes = new Set([
  "en", "es", "fr", "de", "pt", "it", "ru", "zh", "ja", "ar", "hi",
  "yo", "ig", "ha",
  "zu", "xh", "af", "st", "tn", "ss", "ve", "ts",
  "sw", "am", "rw", "sn", "mg", "wo", "ak", "lg", "om", "so",
]);

export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "yo", name: "Yoruba", nativeName: "Yorùbá" },
  { code: "ig", name: "Igbo", nativeName: "Igbo" },
  { code: "ha", name: "Hausa", nativeName: "Hausa" },
  { code: "sw", name: "Swahili", nativeName: "Kiswahili" },
  { code: "zu", name: "Zulu", nativeName: "isiZulu" },
  { code: "xh", name: "Xhosa", nativeName: "isiXhosa" },
  { code: "af", name: "Afrikaans", nativeName: "Afrikaans" },
  { code: "st", name: "Sotho", nativeName: "Sesotho" },
  { code: "tn", name: "Tswana", nativeName: "Setswana" },
  { code: "ss", name: "Swati", nativeName: "siSwati" },
  { code: "ve", name: "Venda", nativeName: "Tshivenda" },
  { code: "ts", name: "Tsonga", nativeName: "Xitsonga" },
  { code: "am", name: "Amharic", nativeName: "አማርኛ" },
  { code: "rw", name: "Kinyarwanda", nativeName: "Ikinyarwanda" },
  { code: "sn", name: "Shona", nativeName: "ChiShona" },
  { code: "mg", name: "Malagasy", nativeName: "Malagasy" },
  { code: "wo", name: "Wolof", nativeName: "Wolof" },
  { code: "ak", name: "Akan", nativeName: "Twi" },
  { code: "lg", name: "Luganda", nativeName: "Luganda" },
  { code: "om", name: "Oromo", nativeName: "Afaan Oromoo" },
  { code: "so", name: "Somali", nativeName: "Soomaali" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "pt", name: "Portuguese", nativeName: "Português" },
  { code: "it", name: "Italian", nativeName: "Italiano" },
  { code: "ru", name: "Russian", nativeName: "Русский" },
  { code: "zh", name: "Chinese", nativeName: "中文" },
  { code: "ja", name: "Japanese", nativeName: "日本語" },
  { code: "ar", name: "Arabic", nativeName: "العربية" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
];

const loaded = new Set<string>(["en"]);

const localeCache: Record<string, any> = {};

const localeModules: Record<string, () => any> = {
  es: () => require("./locales/es.json"),
  fr: () => require("./locales/fr.json"),
  de: () => require("./locales/de.json"),
  pt: () => require("./locales/pt.json"),
  it: () => require("./locales/it.json"),
  ru: () => require("./locales/ru.json"),
  zh: () => require("./locales/zh.json"),
  ja: () => require("./locales/ja.json"),
  ar: () => require("./locales/ar.json"),
  hi: () => require("./locales/hi.json"),
  yo: () => require("./locales/yo.json"),
  ig: () => require("./locales/ig.json"),
  ha: () => require("./locales/ha.json"),
  zu: () => require("./locales/zu.json"),
  xh: () => require("./locales/xh.json"),
  af: () => require("./locales/af.json"),
  st: () => require("./locales/st.json"),
  tn: () => require("./locales/tn.json"),
  ss: () => require("./locales/ss.json"),
  ve: () => require("./locales/ve.json"),
  ts: () => require("./locales/ts.json"),
  sw: () => require("./locales/sw.json"),
  am: () => require("./locales/am.json"),
  rw: () => require("./locales/rw.json"),
  sn: () => require("./locales/sn.json"),
  mg: () => require("./locales/mg.json"),
  wo: () => require("./locales/wo.json"),
  ak: () => require("./locales/ak.json"),
  lg: () => require("./locales/lg.json"),
  om: () => require("./locales/om.json"),
  so: () => require("./locales/so.json"),
};

async function loadLocale(code: string): Promise<void> {
  if (loaded.has(code)) return;
  if (!validCodes.has(code)) return;
  try {
    if (!localeCache[code]) {
      const loader = localeModules[code];
      if (!loader) return;
      localeCache[code] = loader();
    }
    i18n.addResourceBundle(code, "translation", localeCache[code], true, true);
    loaded.add(code);
  } catch {}
}

export function getDayName(dayNumber: number, month: number, year: number, lang?: string): string {
  const date = new Date(year, month - 1, dayNumber);
  const dayIndex = date.getDay();
  const locale = lang || deviceLanguage;
  const localeMap: Record<string, string> = {
    zh: "zh-CN", ar: "ar-SA", he: "he-IL", yo: "yo-NG", ig: "ig-NG", ha: "ha-NG",
    zu: "zu-ZA", xh: "xh-ZA", af: "af-ZA", st: "st-ZA", tn: "tn-ZA", ss: "ss-SZ",
    ve: "ve-ZA", ts: "ts-ZA", sw: "sw-KE", am: "am-ET", rw: "rw-RW", sn: "sn-ZW",
    mg: "mg-MG", wo: "wo-SN", ak: "ak-GH", lg: "ug-UG", om: "om-ET", so: "so-SO",
  };
  try {
    return date.toLocaleDateString(localeMap[locale] || locale, { weekday: "long" });
  } catch {
    const fallbackDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return fallbackDays[dayIndex];
  }
}

export function getShortDayName(dayNumber: number, month: number, year: number, lang?: string): string {
  const date = new Date(year, month - 1, dayNumber);
  const locale = lang || deviceLanguage;
  const localeMap: Record<string, string> = {
    zh: "zh-CN", ar: "ar-SA", he: "he-IL", yo: "yo-NG", ig: "ig-NG", ha: "ha-NG",
    zu: "zu-ZA", xh: "xh-ZA", af: "af-ZA", st: "st-ZA", tn: "tn-ZA", ss: "ss-SZ",
    ve: "ve-ZA", ts: "ts-ZA", sw: "sw-KE", am: "am-ET", rw: "rw-RW", sn: "sn-ZW",
    mg: "mg-MG", wo: "wo-SN", ak: "ak-GH", lg: "ug-UG", om: "om-ET", so: "so-SO",
  };
  try {
    return date.toLocaleDateString(localeMap[locale] || locale, { weekday: "short" });
  } catch {
    const fallbackDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return fallbackDays[date.getDay()];
  }
}

// eslint-disable-next-line import/no-named-as-default-member
i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
  },
  lng: "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
  compatibilityJSON: "v4",
  returnObjects: true,
});

function normalizeCode(code?: string | null): string {
  if (code && validCodes.has(code)) return code;
  if (deviceLanguage && validCodes.has(deviceLanguage)) return deviceLanguage;
  return "en";
}

export async function loadSavedLanguage(): Promise<string> {
  let saved: string | null = null;
  try {
    saved = await AsyncStorage.getItem(STORAGE_KEY);
  } catch {
    saved = null;
  }
  const code = normalizeCode(saved);
  await loadLocale(code);
  if (i18n.language !== code) {
    await i18n.changeLanguage(code);
  }
  return code;
}

export async function setLanguage(code: string): Promise<string> {
  const normalized = normalizeCode(code);
  await loadLocale(normalized);
  await i18n.changeLanguage(normalized);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, normalized);
  } catch {}
  return normalized;
}

export default i18n;
