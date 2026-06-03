export type ThemeMode = "light" | "dark";

export interface ThemePalette {
  bg: string;
  text: string;
  textMuted: string;
  border: string;
  surface: string;
  accent: string;
  accentText: string;
  danger: string;
  like: string;
  badgeBg: string;
}

const LIGHT: ThemePalette = {
  bg: "#ffffff",
  text: "#0f172a",
  textMuted: "#64748b",
  border: "#e2e8f0",
  surface: "#f8fafc",
  accent: "#2563eb",
  accentText: "#ffffff",
  danger: "#dc2626",
  like: "#dc2626",
  badgeBg: "#f1f5f9",
};

const DARK: ThemePalette = {
  bg: "#0b1220",
  text: "#e2e8f0",
  textMuted: "#94a3b8",
  border: "#1e293b",
  surface: "#111a2e",
  accent: "#60a5fa",
  accentText: "#0b1220",
  danger: "#f87171",
  like: "#f87171",
  badgeBg: "#1e293b",
};

export function paletteFor(mode: ThemeMode): ThemePalette {
  return mode === "dark" ? DARK : LIGHT;
}
