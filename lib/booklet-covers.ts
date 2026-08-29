import { ImageSourcePropType } from "react-native";

const monthCovers: Partial<Record<number, ImageSourcePropType>> = {
  1: require("../book thumbnail/january.png"),
  2: require("../book thumbnail/february.png"),
  3: require("../book thumbnail/march.png"),
  4: require("../book thumbnail/april.png"),
  5: require("../book thumbnail/may.png"),
  6: require("../book thumbnail/june.png"),
  7: require("../book thumbnail/july.png"),
  8: require("../book thumbnail/august.png"),
  9: require("../book thumbnail/september.png"),
  10: require("../book thumbnail/october.png"),
  11: require("../book thumbnail/november.png"),
  12: require("../book thumbnail/december.png"),
};

/** Year-specific covers override the generic month thumbnail. */
const yearMonthCovers: Record<string, ImageSourcePropType> = {
  "2026-6": require("../book thumbnail/june 2026.png"),
  "2026-7": require("../book thumbnail/july 2026.png"),
  "2026-8": require("../book thumbnail/august 2026.png"),
  "2026-9": require("../book thumbnail/september 2026.png"),
};

export function getBookletCover(month: number, year?: number): ImageSourcePropType | undefined {
  if (year != null) {
    const key = `${year}-${month}`;
    if (yearMonthCovers[key]) return yearMonthCovers[key];
  }
  return monthCovers[month];
}

export function isJune2026Celebration(month?: number, year?: number): boolean {
  return month === 6 && year === 2026;
}

export const JUNE_2026_CELEBRATION_TAGLINE =
  "Celebrating 1 Year of Wonders of My Life & My Cashflow Affirmations";
