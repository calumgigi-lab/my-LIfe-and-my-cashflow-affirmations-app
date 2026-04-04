const Colors = {
  light: {
    text: "#F7FBFF",
    textSecondary: "#C6D9F0",
    background: "#0F2C4F",
    surface: "#1A436F",
    surfaceSecondary: "#24588D",
    tint: "#9EC9FF",
    tintLight: "#C0DCFF",
    tintDark: "#6FA7EA",
    accent: "#D4A853",
    gold: "#D4A853",
    goldLight: "#4C3C1E",
    goldDark: "#B8862F",
    border: "#4876A8",
    tabIconDefault: "#A6C0E0",
    tabIconSelected: "#D2E6FF",
    success: "#30D158",
    error: "#F06464",
    warning: "#E3A24B",
    cardBg: "#1A436F",
    inputBg: "#235487",
    overlay: "rgba(158, 201, 255, 0.24)",
  },
  dark: {
    text: "#F7FBFF",
    textSecondary: "#C6D9F0",
    background: "#0F2C4F",
    surface: "#1A436F",
    surfaceSecondary: "#24588D",
    tint: "#9EC9FF",
    tintLight: "#C0DCFF",
    tintDark: "#6FA7EA",
    accent: "#D4A853",
    gold: "#D4A853",
    goldLight: "#4C3C1E",
    goldDark: "#B8862F",
    border: "#4876A8",
    tabIconDefault: "#A6C0E0",
    tabIconSelected: "#D2E6FF",
    success: "#30D158",
    error: "#F06464",
    warning: "#E3A24B",
    cardBg: "#1A436F",
    inputBg: "#235487",
    overlay: "rgba(158, 201, 255, 0.24)",
  },
};

export default Colors;

export function useThemeColors(scheme: "light" | "dark" | null | undefined) {
  return scheme === "dark" ? Colors.dark : Colors.light;
}
