import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_PREFIX = "trans_";
const API_BASE = "https://api.mymemory.translated.net/get";
const MAX_CHUNK_CHARS = 450;

const LANG_MAP: Record<string, string> = {
  yo: "yo", ig: "ig", ha: "ha", sw: "sw", zu: "zu", xh: "xh",
  af: "af", st: "st", tn: "tn", ss: "ss", ve: "ve", ts: "ts",
  am: "am", rw: "rw", sn: "sn", mg: "mg", wo: "wo", ak: "ak",
  lg: "lg", om: "om", so: "so",
  es: "es", fr: "fr", de: "de", pt: "pt", it: "it", ru: "ru",
  zh: "zh-CN", ja: "ja", ar: "ar", hi: "hi",
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

function decodeResult(text: string): string {
  try {
    let decoded = text;
    if (decoded.includes("%20") || decoded.includes("%27") || decoded.includes("%2C")) {
      decoded = decodeURIComponent(decoded);
    }
    decoded = decoded.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
    return decoded;
  } catch {
    return text;
  }
}

async function callMyMemory(text: string, targetLang: string): Promise<string | null> {
  const mappedLang = LANG_MAP[targetLang] || targetLang;
  const url = `${API_BASE}?q=${encodeURIComponent(text)}&langpair=en|${mappedLang}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data?.responseStatus === 200 && data?.responseData?.translatedText) {
      const translated = data.responseData.translatedText;
      if (translated && translated !== text && !translated.includes("MYMEMORY WARNING")) {
        return decodeResult(translated);
      }
    }
  } catch {}
  return null;
}

function splitIntoChunks(text: string): string[] {
  if (text.length <= MAX_CHUNK_CHARS) return [text];

  const paragraphs = text.split("\n\n");
  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    if ((current + "\n\n" + para).length > MAX_CHUNK_CHARS && current) {
      chunks.push(current);
      current = para;
    } else {
      current = current ? current + "\n\n" + para : para;
    }
  }
  if (current) chunks.push(current);

  const finalChunks: string[] = [];
  for (const chunk of chunks) {
    if (chunk.length > MAX_CHUNK_CHARS) {
      const sentences = chunk.split(/(?<=[.!?])\s+/);
      let buf = "";
      for (const sent of sentences) {
        if ((buf + " " + sent).length > MAX_CHUNK_CHARS && buf) {
          finalChunks.push(buf);
          buf = sent;
        } else {
          buf = buf ? buf + " " + sent : sent;
        }
      }
      if (buf) finalChunks.push(buf);
    } else {
      finalChunks.push(chunk);
    }
  }

  return finalChunks.length ? finalChunks : [text];
}

export async function translateText(text: string, targetLang: string): Promise<string> {
  if (!text || !text.trim()) return text;
  if (targetLang === "en") return text;

  const cached = await getCached(text, targetLang);
  if (cached) return cached;

  const chunks = splitIntoChunks(text);
  const results: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const translated = await callMyMemory(chunks[i], targetLang);
    results.push(translated || chunks[i]);
    if (i < chunks.length - 1) {
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  const result = results.join("\n\n");
  await setCached(text, targetLang, result);
  return result;
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
