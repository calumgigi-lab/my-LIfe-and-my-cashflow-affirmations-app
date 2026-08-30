import { useMemo } from "react";

export function useTranslatedContent(content: string | undefined): {
  translatedContent: string;
  isTranslating: boolean;
} {
  return useMemo(
    () => ({ translatedContent: content ?? "", isTranslating: false }),
    [content]
  );
}

export function useTranslatedAffirmation(
  title: string | undefined,
  content: string | undefined
): {
  translatedTitle: string;
  translatedContent: string;
  isTranslating: boolean;
} {
  return useMemo(
    () => ({
      translatedTitle: title ?? "",
      translatedContent: content ?? "",
      isTranslating: false,
    }),
    [title, content]
  );
}
