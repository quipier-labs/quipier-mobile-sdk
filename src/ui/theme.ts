import type { Appearance, AvatarShape, ResolvedTheme } from "../core/customize";

export type ThemeMode = "light" | "dark";

/** The resolved theme handed to every component as `palette`. Includes colors
 *  plus typography/shape/spacing tokens. */
export type ThemePalette = ResolvedTheme;

const COMMON = {
  fontFamily: undefined as string | undefined,
  fontSize: 14,
  radius: 8,
  pillRadius: 999,
  gap: 16,
  avatarShape: "circle" as AvatarShape,
};

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
  ...COMMON,
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
  ...COMMON,
};

export function paletteFor(mode: ThemeMode): ThemePalette {
  return mode === "dark" ? DARK : LIGHT;
}

/** Merge a friendly `appearance` over the mode's base palette. Unset keys keep
 *  the default — an undefined appearance yields the stock palette. */
export function resolveTheme(
  mode: ThemeMode,
  appearance: Appearance | undefined,
): ThemePalette {
  const base = paletteFor(mode);
  if (!appearance) return base;
  return {
    ...base,
    ...(appearance.bg !== undefined && { bg: appearance.bg }),
    ...(appearance.text !== undefined && { text: appearance.text }),
    ...(appearance.textMuted !== undefined && { textMuted: appearance.textMuted }),
    ...(appearance.border !== undefined && { border: appearance.border }),
    ...(appearance.surface !== undefined && { surface: appearance.surface }),
    ...(appearance.accent !== undefined && { accent: appearance.accent }),
    ...(appearance.accentText !== undefined && { accentText: appearance.accentText }),
    ...(appearance.danger !== undefined && { danger: appearance.danger }),
    ...(appearance.like !== undefined && { like: appearance.like }),
    ...(appearance.fontFamily !== undefined && { fontFamily: appearance.fontFamily }),
    ...(appearance.fontSize !== undefined && { fontSize: appearance.fontSize }),
    ...(appearance.radius !== undefined && { radius: appearance.radius }),
    ...(appearance.pillRadius !== undefined && { pillRadius: appearance.pillRadius }),
    ...(appearance.gap !== undefined && { gap: appearance.gap }),
    ...(appearance.avatarShape !== undefined && { avatarShape: appearance.avatarShape }),
  };
}

/** Avatar corner radius for a given pixel size + shape. */
export function avatarBorderRadius(size: number, shape: AvatarShape): number {
  if (shape === "circle") return size / 2;
  if (shape === "rounded") return Math.round(size * 0.28);
  return Math.round(size * 0.14); // square — a small softening
}
