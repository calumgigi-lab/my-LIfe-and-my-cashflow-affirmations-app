/**
 * Translation service with Google Cloud Translation API (primary)
 * and LibreTranslate (fallback).
 *
 * Environment variables:
 *   GOOGLE_TRANSLATE_API_KEY  — Google Cloud Translation API key
 *   LIBRETRANSLATE_URL        — Self-hosted LibreTranslate URL (default: http://localhost:5000/translate)
 *   LIBRETRANSLATE_API_KEY    — Optional LibreTranslate API key
 */

const GOOGLE_API = "https://translation.googleapis.com/language/translate/v2";
const DEFAULT_LIBRE_URL = "http://localhost:5000/translate";

function getGoogleKey() {
  return process.env.GOOGLE_TRANSLATE_API_KEY || "";
}

function getLibreUrl() {
  return process.env.LIBRETRANSLATE_URL || DEFAULT_LIBRE_URL;
}

function getLibreKey() {
  return process.env.LIBRETRANSLATE_API_KEY || "";
}

/**
 * Translate a block of text from English to the target language.
 * Tries Google Cloud Translation API first, falls back to LibreTranslate.
 * Returns the translated text on success, or the original text on failure.
 */
async function translateText(text, targetLang) {
  if (!text || !targetLang || targetLang === "en") return text;

  // Try Google first
  const googleKey = getGoogleKey();
  if (googleKey) {
    try {
      const result = await translateGoogle(text, targetLang, googleKey);
      if (result) return result;
    } catch (e) {
      console.warn(`Google Translate failed for ${targetLang}: ${e.message}`);
    }
  }

  // Fallback to LibreTranslate
  try {
    const result = await translateLibre(text, targetLang);
    if (result) return result;
  } catch (e) {
    console.warn(`LibreTranslate failed for ${targetLang}: ${e.message}`);
  }

  return text;
}

async function translateGoogle(text, targetLang, apiKey) {
  const url = `${GOOGLE_API}?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      q: text,
      target: targetLang,
      source: "en",
      format: "text",
    }),
  });
  if (!response.ok) {
    const err = await response.text().catch(() => "");
    throw new Error(`Google Translate HTTP ${response.status}: ${err}`);
  }
  const data = await response.json();
  const translation = data?.data?.translations?.[0]?.translatedText;
  if (!translation) throw new Error("Empty Google Translate response");
  return translation;
}

async function translateLibre(text, targetLang) {
  const url = getLibreUrl();
  const body = {
    q: text,
    source: "en",
    target: targetLang,
  };
  const libreKey = getLibreKey();
  if (libreKey) body.api_key = libreKey;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const err = await response.text().catch(() => "");
    throw new Error(`LibreTranslate HTTP ${response.status}: ${err}`);
  }
  const data = await response.json();
  const translation = data?.translatedText;
  if (!translation) throw new Error("Empty LibreTranslate response");
  return translation;
}

/**
 * Translate an entire affirmation object (title + content).
 * Returns { title, content } with translated strings.
 */
async function translateAffirmation(title, content, targetLang) {
  const [translatedTitle, translatedContent] = await Promise.all([
    translateText(title, targetLang),
    translateText(content, targetLang),
  ]);
  return { title: translatedTitle, content: translatedContent };
}

module.exports = { translateText, translateAffirmation };
