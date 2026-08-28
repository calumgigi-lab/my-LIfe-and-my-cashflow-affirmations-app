import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import de from "./locales/de.json";
import pt from "./locales/pt.json";
import it from "./locales/it.json";
import ru from "./locales/ru.json";
import zh from "./locales/zh.json";
import ja from "./locales/ja.json";
import ar from "./locales/ar.json";
import hi from "./locales/hi.json";
import yo from "./locales/yo.json";
import ig from "./locales/ig.json";
import ha from "./locales/ha.json";

const deviceLanguage = getLocales()?.[0]?.languageCode ?? "en";

export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", nativeName: "English" },
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
  { code: "yo", name: "Yoruba", nativeName: "Yorùbá" },
  { code: "ig", name: "Igbo", nativeName: "Igbo" },
  { code: "ha", name: "Hausa", nativeName: "Hausa" },
];

const resources = {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
  de: { translation: de },
  pt: { translation: pt },
  it: { translation: it },
  ru: { translation: ru },
  zh: { translation: zh },
  ja: { translation: ja },
  ar: { translation: ar },
  hi: { translation: hi },
  yo: { translation: yo },
  ig: { translation: ig },
  ha: { translation: ha },
};

export function getDayName(dayNumber: number, month: number, year: number, lang?: string): string {
  const date = new Date(year, month - 1, dayNumber);
  const dayIndex = date.getDay();
  const locale = lang || deviceLanguage;
  try {
    return date.toLocaleDateString(locale === "zh" ? "zh-CN" : locale === "ar" ? "ar-SA" : locale, { weekday: "long" });
  } catch {
    const fallbackDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return fallbackDays[dayIndex];
  }
}

export function getShortDayName(dayNumber: number, month: number, year: number, lang?: string): string {
  const date = new Date(year, month - 1, dayNumber);
  const locale = lang || deviceLanguage;
  try {
    return date.toLocaleDateString(locale === "zh" ? "zh-CN" : locale === "ar" ? "ar-SA" : locale, { weekday: "short" });
  } catch {
    const fallbackDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return fallbackDays[date.getDay()];
  }
}

// eslint-disable-next-line import/no-named-as-default-member
i18n.use(initReactI18next).init({
  resources,
  lng: deviceLanguage,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
  compatibilityJSON: "v4",
  returnObjects: true,
});

export default i18n;
