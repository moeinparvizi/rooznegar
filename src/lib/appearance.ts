import { APPEARANCE_KEY, THEME_KEY } from "./defaults";
import { ACCENTS, CATEGORY_TONES, PALETTES } from "./palettes";
import type {
  AccentId,
  AppSettingsV2,
  BloomStyle,
  CategoryTone,
  PaletteId,
  ThemeChoice,
} from "./types";

export type ThemeMode = "light" | "dark";

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export function parseHex(hex: string): Rgb {
  let value = hex.trim().replace("#", "");
  if (value.length === 3) {
    value = value
      .split("")
      .map((char) => char + char)
      .join("");
  }
  const int = Number.parseInt(value.slice(0, 6), 16);
  if (!Number.isFinite(int)) return { r: 0, g: 0, b: 0 };
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

export function toHex({ r, g, b }: Rgb): string {
  const part = (value: number) =>
    Math.round(Math.min(255, Math.max(0, value)))
      .toString(16)
      .padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
}

/** Mixes `a` over `b`; weight is the share of `a` (0..1). */
export function mix(a: string, b: string, weight = 0.5): string {
  const first = parseHex(a);
  const second = parseHex(b);
  const w = clamp01(weight);
  return toHex({
    r: first.r * w + second.r * (1 - w),
    g: first.g * w + second.g * (1 - w),
    b: first.b * w + second.b * (1 - w),
  });
}

export function rgba(hex: string, alpha: number): string {
  const { r, g, b } = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${Math.min(1, Math.max(0, alpha))})`;
}

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  const { r, g, b } = parseHex(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const first = luminance(a);
  const second = luminance(b);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Pushes `fg` toward black or white until it is readable on `bg`. */
export function ensureContrast(fg: string, bg: string, min = 4.5): string {
  if (contrastRatio(fg, bg) >= min) return fg;
  const direction = luminance(bg) > 0.32 ? "#000000" : "#ffffff";
  let candidate = fg;
  for (let step = 1; step <= 20; step += 1) {
    candidate = mix(direction, fg, step / 20);
    if (contrastRatio(candidate, bg) >= min) return candidate;
  }
  return candidate;
}

export function readableOn(bg: string): string {
  const light = "#fbf8ef";
  const dark = "#101713";
  return contrastRatio(light, bg) >= contrastRatio(dark, bg) ? light : dark;
}

function nearestAccent(hex: string, mode: ThemeMode): AccentId {
  const target = parseHex(hex);
  let best = ACCENTS[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const accent of ACCENTS) {
    const candidate = parseHex(accent[mode]);
    const distance =
      (candidate.r - target.r) ** 2 +
      (candidate.g - target.g) ** 2 +
      (candidate.b - target.b) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = accent;
    }
  }
  return best.id;
}

function petals(
  style: BloomStyle,
  accent: string,
  greenDeep: string,
  surface: string,
  tone: (id: CategoryTone) => { base: string; soft: string; ink: string },
): string[] {
  const gold = tone("gold").base;
  const cream = mix(gold, surface, 0.42);
  switch (style) {
    case "cream":
      return [cream, gold, cream, tone("clay").base, cream];
    case "gold":
      return [gold, cream, gold, mix(gold, greenDeep, 0.55), gold];
    case "leaf":
      return [accent, tone("olive").base, mix(accent, surface, 0.58), tone("tea").base, greenDeep];
    default:
      return [
        accent,
        gold,
        tone("blue").base,
        tone("clay").base,
        tone("olive").base,
      ];
  }
}

/**
 * Every palette-dependent CSS variable for one palette/accent/mode.
 * Pure, so it can be serialized into the first-paint script.
 */
export function appearanceVars(
  paletteId: PaletteId,
  accentId: AccentId,
  mode: ThemeMode,
  bloomStyle: BloomStyle = "auto",
): Record<string, string> {
  const palette = PALETTES.find((item) => item.id === paletteId) ?? PALETTES[0];
  const accentDef = ACCENTS.find((item) => item.id === accentId) ?? ACCENTS[0];
  const [paper, surface] = palette[mode];
  const rawInk = palette[mode][3];

  const ink = ensureContrast(rawInk, paper, 9);
  const ink2 = ensureContrast(mix(rawInk, paper, 0.8), surface, 6.5);
  const muted = ensureContrast(mix(rawInk, paper, 0.55), surface, 4.5);
  const faint = ensureContrast(mix(rawInk, paper, 0.72), surface, 3);

  const accent = ensureContrast(accentDef[mode], paper, 4.5);
  const greenDeep = ensureContrast(mix(accent, ink, 0.42), surface, 4.5);
  const greenSoft = mix(accent, surface, 0.18);
  const greenWash = mix(accent, surface, 0.1);

  const buttonBg = mode === "dark" ? accent : greenDeep;
  const buttonInk = ensureContrast(readableOn(buttonBg), buttonBg, 4.5);

  const tones = {} as Record<CategoryTone, { base: string; soft: string; ink: string }>;
  for (const tone of CATEGORY_TONES) {
    const base = ensureContrast(tone[mode], surface, 3.2);
    const soft = mix(base, surface, 0.17);
    tones[tone.id] = {
      base,
      soft,
      ink: ensureContrast(base, soft, 4.5),
    };
  }

  const petalColors = petals(bloomStyle, accent, greenDeep, surface, (id) => tones[id]);
  const gold = tones.gold.base;

  const vars: Record<string, string> = {
    "--paper": paper,
    "--paper-2": mix(paper, ink, 0.05),
    "--surface": surface,
    "--surface-2": mix(surface, ink, 0.035),
    "--ink": ink,
    "--ink-2": ink2,
    "--muted": muted,
    "--faint": faint,
    "--line": rgba(ink, mode === "dark" ? 0.15 : 0.12),
    "--line-strong": rgba(ink, mode === "dark" ? 0.26 : 0.2),
    "--green": accent,
    "--green-deep": greenDeep,
    "--green-soft": greenSoft,
    "--green-wash": greenWash,
    "--btn-bg": buttonBg,
    "--btn-ink": buttonInk,
    "--danger": ensureContrast(mode === "dark" ? "#d98770" : "#b4573f", surface, 4.5),
    "--bloom-cream": mix(gold, surface, 0.42),
    "--bloom-gold": gold,
    "--petal-1": petalColors[0],
    "--petal-2": petalColors[1],
    "--petal-3": petalColors[2],
    "--petal-4": petalColors[3],
    "--petal-5": petalColors[4],
  };

  for (const tone of CATEGORY_TONES) {
    const value = tones[tone.id];
    vars[`--tone-${tone.id}`] = value.base;
    vars[`--tone-${tone.id}-soft`] = value.soft;
    vars[`--tone-${tone.id}-ink`] = value.ink;
    vars[`--${tone.id}`] = value.base;
    vars[`--${tone.id}-soft`] = value.soft;
  }

  return vars;
}

export const PALETTE_PRELOAD: Record<string, Record<string, string>> =
  Object.fromEntries(
    PALETTES.flatMap((palette) =>
      (["light", "dark"] as const).map((mode) => [
        `${palette.id}:${mode}`,
        appearanceVars(palette.id, nearestAccent(palette[mode][2], mode), mode),
      ]),
    ),
  );

export function resolveMode(theme: ThemeChoice): ThemeMode {
  if (typeof window === "undefined") return "light";
  if (theme === "light" || theme === "dark") return theme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export interface AppearanceChoice {
  palette: PaletteId;
  accent: AccentId;
  bloomStyle: BloomStyle;
}

export function readAppearance(): AppearanceChoice {
  const fallback: AppearanceChoice = {
    palette: "garden",
    accent: "green",
    bloomStyle: "auto",
  };
  if (typeof window === "undefined") return fallback;
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(APPEARANCE_KEY) ?? "{}",
    ) as Partial<AppearanceChoice>;
    return {
      palette: PALETTES.some((item) => item.id === parsed.palette)
        ? (parsed.palette as PaletteId)
        : "garden",
      accent: ACCENTS.some((item) => item.id === parsed.accent)
        ? (parsed.accent as AccentId)
        : "green",
      bloomStyle:
        parsed.bloomStyle === "cream" ||
        parsed.bloomStyle === "gold" ||
        parsed.bloomStyle === "leaf"
          ? parsed.bloomStyle
          : "auto",
    };
  } catch {
    return fallback;
  }
}

export type AppearanceSettings = Pick<
  AppSettingsV2,
  "palette" | "accent" | "theme" | "bloomStyle"
>;

export function applyAppearance(settings: AppearanceSettings) {
  if (typeof document === "undefined") return;
  const mode = resolveMode(settings.theme);
  const vars = appearanceVars(
    settings.palette,
    settings.accent,
    mode,
    settings.bloomStyle,
  );
  const root = document.documentElement;
  root.dataset.theme = mode;
  root.dataset.palette = settings.palette;
  root.dataset.bloom = settings.bloomStyle;
  for (const [name, value] of Object.entries(vars)) {
    root.style.setProperty(name, value);
  }
  try {
    window.localStorage.setItem(
      APPEARANCE_KEY,
      JSON.stringify({
        palette: settings.palette,
        accent: settings.accent,
        bloomStyle: settings.bloomStyle,
      }),
    );
    window.localStorage.setItem(THEME_KEY, settings.theme);
  } catch {
    /* storage can be unavailable in private mode */
  }
  const lightPaper = appearanceVars(settings.palette, settings.accent, "light")[
    "--paper"
  ];
  const darkPaper = appearanceVars(settings.palette, settings.accent, "dark")[
    "--paper"
  ];
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((meta) =>
      meta.setAttribute(
        "content",
        meta.getAttribute("media")?.includes("dark") ? darkPaper : lightPaper,
      ),
    );
}
