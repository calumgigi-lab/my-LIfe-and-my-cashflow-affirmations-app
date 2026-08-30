import { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { translateText } from "./translate";

export function useTranslatedContent(content: string | undefined): {
  translatedContent: string;
  isTranslating: boolean;
} {
  const { i18n } = useTranslation();
  const lang = i18n.language || "en";
  const [translatedContent, setTranslatedContent] = useState(content ?? "");
  const [isTranslating, setIsTranslating] = useState(false);
  const mountedRef = useRef(true);
  const lastKey = useRef("");

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!content) {
      setTranslatedContent("");
      setIsTranslating(false);
      return;
    }

    const effectiveLang = lang.startsWith("en") ? "en" : lang;

    if (effectiveLang === "en") {
      setTranslatedContent(content);
      setIsTranslating(false);
      return;
    }

    const cacheKey = `${content.substring(0, 50)}|${effectiveLang}`;
    if (lastKey.current === cacheKey) return;
    lastKey.current = cacheKey;

    let cancelled = false;
    setIsTranslating(true);

    translateText(content, effectiveLang)
      .then((result) => {
        if (!cancelled && mountedRef.current) {
          setTranslatedContent(result);
          setIsTranslating(false);
        }
      })
      .catch(() => {
        if (!cancelled && mountedRef.current) {
          setTranslatedContent(content);
          setIsTranslating(false);
        }
      });

    return () => { cancelled = true; };
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
  const { i18n } = useTranslation();
  const lang = i18n.language || "en";
  const [translatedTitle, setTranslatedTitle] = useState(title ?? "");
  const [translatedBody, setTranslatedBody] = useState(content ?? "");
  const [isTranslating, setIsTranslating] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const effectiveLang = lang.startsWith("en") ? "en" : lang;

    if (effectiveLang === "en") {
      setTranslatedTitle(title ?? "");
      setTranslatedBody(content ?? "");
      setIsTranslating(false);
      return;
    }

    if (!title && !content) {
      setTranslatedTitle("");
      setTranslatedBody("");
      setIsTranslating(false);
      return;
    }

    let cancelled = false;
    setIsTranslating(true);

    const doTranslate = async () => {
      try {
        const results = await Promise.all([
          title ? translateText(title, effectiveLang) : Promise.resolve(""),
          content ? translateText(content, effectiveLang) : Promise.resolve(""),
        ]);
        if (!cancelled && mountedRef.current) {
          setTranslatedTitle(results[0]);
          setTranslatedBody(results[1]);
          setIsTranslating(false);
        }
      } catch {
        if (!cancelled && mountedRef.current) {
          setTranslatedTitle(title ?? "");
          setTranslatedBody(content ?? "");
          setIsTranslating(false);
        }
      }
    };

    doTranslate();
    return () => { cancelled = true; };
  }, [title, content, lang]);

  return useMemo(
    () => ({ translatedTitle, translatedContent: translatedBody, isTranslating }),
    [translatedTitle, translatedBody, isTranslating]
  );
}
