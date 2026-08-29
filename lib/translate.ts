import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_PREFIX = "trans_";
const API_BASE = "https://api.mymemory.translated.net/get";
const BATCH_DELAY_MS = 200;

const LANG_MAP: Record<string, string> = {
  tn: "tn",
  ss: "ss",
  ve: "ve",
  ts: "ts",
  rw: "rw",
  sn: "sn",
  mg: "mg",
  wo: "wo",
  ak: "ak",
  lg: "lg",
  om: "om",
  zu: "zu",
  xh: "xh",
  st: "st",
  af: "af",
  sw: "sw",
  am: "am",
  so: "so",
};

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(36);
}

function getCacheKey(text: string, targetLang: string): string {
  return `${CACHE_PREFIX}${hashString(text + targetLang)}`;
}

async function getCached(text: string, targetLang: string): Promise<string | null> {
  try {
    const key = getCacheKey(text, targetLang);
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

async function setCached(text: string, targetLang: string, translated: string): Promise<void> {
  try {
    const key = getCacheKey(text, targetLang);
    await AsyncStorage.setItem(key, translated);
  } catch {}
}

export async function translateText(text: string, targetLang: string): Promise<string> {
  if (!text || !text.trim()) return text;
  if (targetLang === "en") return text;

  const cached = await getCached(text, targetLang);
  if (cached) return cached;

  const mappedLang = LANG_MAP[targetLang] || targetLang;

  try {
    const url = `${API_BASE}?q=${encodeURIComponent(text)}&langpair=en|${mappedLang}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data?.responseStatus === 200 && data?.responseData?.translatedText) {
      const translated = data.responseData.translatedText;
      await setCached(text, targetLang, translated);
      return translated;
    }
  } catch {}

  return text;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function translateBatch(texts: string[], targetLang: string): Promise<string[]> {
  if (!texts.length) return [];
  if (targetLang === "en") return [...texts];

  const results: string[] = [];
  for (let i = 0; i < texts.length; i++) {
    const translated = await translateText(texts[i], targetLang);
    results.push(translated);
    if (i < texts.length - 1) {
      await delay(BATCH_DELAY_MS);
    }
  }
  return results;
}

export async function clearTranslationCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const transKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX));
    if (transKeys.length) {
      await AsyncStorage.multiRemove(transKeys);
    }
  } catch {}
}
