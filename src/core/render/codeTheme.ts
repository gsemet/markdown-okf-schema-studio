/**
 * The colours of highlighted code blocks: the VS Code Dark+ theme (and Light+ for the blocks that
 * keep a light background), as a fixed set of CSS classes.
 *
 * The preview page forbids inline `style` attributes (Content-Security-Policy), so a token never
 * carries its colour: the highlighter gives it a class named after the colour (`sd-6a9955`) and the
 * stylesheet, generated from the same theme files, defines every class. The dark colour is the
 * default; a light colour class (`sl-…`) applies only when the page asks for light blocks.
 */

import darkPlus from "@shikijs/themes/dark-plus";
import lightPlus from "@shikijs/themes/light-plus";

interface ThemeSource {
  colors?: Record<string, string>;
  tokenColors?: Array<{ settings?: { foreground?: string } }>;
  settings?: Array<{ settings?: { foreground?: string } }>;
}

/** The background and default text colour of a theme. */
export interface CodeThemeSurface {
  background: string;
  foreground: string;
}

const HEX_COLOR = /^#[0-9a-f]{6}$/u;

/** A theme colour as `#rrggbb` (lower case), or undefined for a missing or non-opaque value. */
export function normalizeCodeColor(value: string | undefined): string | undefined {
  const lower = value?.toLowerCase();
  return lower !== undefined && HEX_COLOR.test(lower) ? lower : undefined;
}

function surfaceOf(theme: ThemeSource, fallback: CodeThemeSurface): CodeThemeSurface {
  return {
    background: normalizeCodeColor(theme.colors?.["editor.background"]) ?? fallback.background,
    foreground: normalizeCodeColor(theme.colors?.["editor.foreground"]) ?? fallback.foreground,
  };
}

/** Dark+: the dark code background and the default text colour on it. */
export const DARK_CODE_SURFACE = surfaceOf(darkPlus as ThemeSource, { background: "#1e1e1e", foreground: "#d4d4d4" });
/** Light+: the surface of the light variant. */
export const LIGHT_CODE_SURFACE = surfaceOf(lightPlus as ThemeSource, { background: "#ffffff", foreground: "#000000" });

/** The colour of the line numbers on the dark background (AA contrast on Dark+, see the tests). */
export const DARK_LINE_NUMBER_COLOR = "#9d9d9d";

/** The cream preview background: the darkest page colour a light block sits on (for Light+ contrast). */
const LIGHT_BLOCK_BACKGROUND = "#ede6da";
/** The WCAG AA contrast ratio for normal text. */
export const MINIMUM_CONTRAST = 4.5;

function channel(value: number): number {
  const unit = value / 255;
  return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
}

function luminance(color: string): number {
  const [red, green, blue] = [1, 3, 5].map((start) => channel(Number.parseInt(color.slice(start, start + 2), 16)));
  return 0.2126 * red! + 0.7152 * green! + 0.0722 * blue!;
}

/** The WCAG contrast ratio of two `#rrggbb` colours. */
export function contrastRatio(first: string, second: string): number {
  const [light, dark] = [luminance(first), luminance(second)].sort((left, right) => right - left);
  return (light! + 0.05) / (dark! + 0.05);
}

function mixed(color: string, target: number, amount: number): string {
  return `#${[1, 3, 5].map((start) => {
    const value = Number.parseInt(color.slice(start, start + 2), 16);
    return Math.round(value + (target - value) * amount).toString(16).padStart(2, "0");
  }).join("")}`;
}

/**
 * `color` itself when it reads at AA contrast on `background`; else the nearest tint (towards white
 * on a dark background, towards black on a light one) that does. Dark+ and Light+ have a few
 * token colours (the navy of a Markdown header, the muted regular expression grey) below AA.
 */
const readableCache = new Map<string, string>();

function readable(color: string, background: string): string {
  const key = `${color}|${background}`;
  let result = readableCache.get(key);
  if (result === undefined) {
    result = adjusted(color, background);
    readableCache.set(key, result);
  }
  return result;
}

function adjusted(color: string, background: string): string {
  if (contrastRatio(color, background) >= MINIMUM_CONTRAST) return color;
  const target = luminance(background) < 0.5 ? 255 : 0;
  for (let amount = 0.02; amount < 1; amount += 0.02) {
    const candidate = mixed(color, target, amount);
    if (contrastRatio(candidate, background) >= MINIMUM_CONTRAST) return candidate;
  }
  return mixed(color, target, 1);
}

/** The colour a Dark+ token colour is drawn in on the dark background. */
export function darkTokenColor(color: string): string {
  return readable(color, DARK_CODE_SURFACE.background);
}

/** The colour a Light+ token colour is drawn in on a light block. */
export function lightTokenColor(color: string): string {
  return readable(color, LIGHT_BLOCK_BACKGROUND);
}

function foregroundsOf(theme: ThemeSource): Set<string> {
  const colors = new Set<string>();
  for (const rule of [...(theme.tokenColors ?? []), ...(theme.settings ?? [])]) {
    const color = normalizeCodeColor(rule.settings?.foreground);
    if (color !== undefined) colors.add(color);
  }
  return colors;
}

const DARK_COLORS = new Set([...foregroundsOf(darkPlus as ThemeSource), DARK_CODE_SURFACE.foreground].map(darkTokenColor));
const LIGHT_COLORS = new Set([...foregroundsOf(lightPlus as ThemeSource), LIGHT_CODE_SURFACE.foreground].map(lightTokenColor));

/** The class of a token colour in the dark variant. */
export function darkColorClass(color: string): string {
  return `sd-${color.slice(1)}`;
}

/** The class of a token colour in the light variant. */
export function lightColorClass(color: string): string {
  return `sl-${color.slice(1)}`;
}

/** Every colour the dark variant can draw, as `#rrggbb`. */
export function darkPaletteColors(): string[] {
  return [...DARK_COLORS].sort();
}

/** Every colour the light variant can draw, as `#rrggbb`. */
export function lightPaletteColors(): string[] {
  return [...LIGHT_COLORS].sort();
}

/**
 * The rules of every token colour class: the dark colours under `darkScope`, and the light colours
 * under each of `lightScopes` (selector prefixes that are true only when the page shows light
 * blocks, with the specificity to win over the dark rules).
 */
export function codeColorRules(darkScope: string, lightScopes: readonly string[]): string {
  const dark = darkPaletteColors().map((color) => `${darkScope} .${darkColorClass(color)} { color: ${color}; }`);
  const light = lightPaletteColors().map((color) =>
    `${lightScopes.map((scope) => `${scope} .${lightColorClass(color)}`).join(",\n")} { color: ${color}; }`);
  return [...dark, ...light].join("\n");
}
