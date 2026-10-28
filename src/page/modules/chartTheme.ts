import type { ChartTheme } from "./vegaChart";

/** True for an opaque, dark CSS colour (`rgb()`/`rgba()` as `getComputedStyle` reports it). */
function isDarkColor(color: string): boolean {
  const channels = (color.match(/[\d.]+/gu) ?? []).map(Number);
  if (channels.length < 3 || (channels.length >= 4 && channels[3] === 0)) return false;
  const [red, green, blue] = channels.slice(0, 3).map((value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red! + 0.7152 * green! + 0.0722 * blue! < 0.18;
}

/** The chart theme of a page from the value of its CSS variables (`read` returns "" when unset). */
export function chartThemeFrom(read: (name: string) => string, backgroundColor: string): ChartTheme {
  const value = (name: string, fallback: string): string => read(name) || fallback;
  const dark = isDarkColor(backgroundColor);
  return {
    dark,
    foreground: value("--studio-editor-foreground", dark ? "#e6e6e6" : "#1f1f1f"),
    muted: value("--studio-descriptionForeground", dark ? "#a0a0a0" : "#6b6b6b"),
    grid: value("--sphinx-preview-border", dark ? "#3c3c3c" : "#d4d4d4"),
    accent: value("--studio-textLink-foreground", dark ? "#6aa7e8" : "#2f6db5"),
    fontFamily: value("--sphinx-preview-font", "sans-serif"),
  };
}
