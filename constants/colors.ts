const Colors = {
  light: {
    text: "#1A1A1A",
    textSecondary: "#6B6B6B",
    background: "#FAFAF8",
    surface: "#FFFFFF",
    surfaceSecondary: "#F5F3EF",
    tint: "#C8973E",
    tintLight: "#E8D5A8",
    tintDark: "#A07830",
    accent: "#D4A853",
    gold: "#C8973E",
    goldLight: "#F0E0C0",
    goldDark: "#8B6914",
    border: "#E8E4DD",
    tabIconDefault: "#9E9E9E",
    tabIconSelected: "#C8973E",
    success: "#34C759",
    error: "#FF3B30",
    warning: "#FF9500",
    cardBg: "#FFFFFF",
    inputBg: "#F5F3EF",
    overlay: "rgba(0,0,0,0.4)",
  },
  dark: {
    text: "#F5F0E8",
    textSecondary: "#A09888",
    background: "#0A0A0A",
    surface: "#1A1814",
    surfaceSecondary: "#242018",
    tint: "#D4A853",
    tintLight: "#5A4A2E",
    tintDark: "#E8C878",
    accent: "#D4A853",
    gold: "#D4A853",
    goldLight: "#3A2E18",
    goldDark: "#F0D890",
    border: "#2A2620",
    tabIconDefault: "#6B6B6B",
    tabIconSelected: "#D4A853",
    success: "#30D158",
    error: "#FF453A",
    warning: "#FFD60A",
    cardBg: "#1A1814",
    inputBg: "#242018",
    overlay: "rgba(0,0,0,0.7)",
  },
};

export default Colors;

export function useThemeColors(scheme: "light" | "dark" | null | undefined) {
  return scheme === "dark" ? Colors.dark : Colors.light;
}
