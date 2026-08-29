import { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { translateText } from "./translate";

const DEBOUNCE_MS = 500;

export function useTranslatedContent(content: string | undefined): {
  translatedContent: string;
  isTranslating: boolean;
} {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const [translatedContent, setTranslatedContent] = useState(content ?? "");
  const [isTranslating, setIsTranslating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (!content) {
      setTranslatedContent("");
      setIsTranslating(false);
      return;
    }

    if (lang === "en") {
      setTranslatedContent(content);
      setIsTranslating(false);
      return;
    }

    setIsTranslating(true);

    timerRef.current = setTimeout(async () => {
      try {
        const result = await translateText(content, lang);
        if (mountedRef.current) {
          setTranslatedContent(result);
          setIsTranslating(false);
        }
      } catch {
        if (mountedRef.current) {
          setTranslatedContent(content);
          setIsTranslating(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [content, lang]);

  return { translatedContent, isTranslating };
}

export function useTranslatedAffirmation(
  title: string | undefined,
  content: string | undefined
): {
  translatedTitle: string;
  translatedContent: string;
  isTranslating: boolean;
} {
  const titleResult = useTranslatedContent(title);
  const contentResult = useTranslatedContent(content);

  const isTranslating = titleResult.isTranslating || contentResult.isTranslating;

  return useMemo(
    () => ({
      translatedTitle: titleResult.translatedContent,
      translatedContent: contentResult.translatedContent,
      isTranslating,
    }),
    [titleResult.translatedContent, titleResult.isTranslating, contentResult.translatedContent, contentResult.isTranslating, isTranslating]
  );
}
