/**
 * The config and the loader of the charts of the preview page (`vegaView.ts` draws them, and
 * `vegaPreview.ts` is bundled by esbuild into `out/bundle/vegaPreview.js`).
 *
 * The page's Content Security Policy has no `unsafe-eval`: the spec is parsed to an expression
 * AST (`ast: true`) and `vega-interpreter` evaluates it, so no expression is compiled to
 * JavaScript. The page has no network either (`connect-src 'none'`): data comes from inline
 * `values` or from the files the host read and handed over (`ChartFiles`), through a loader that
 * serves nothing else.
 */
import type * as vega from "vega";

import { type ChartFiles, isRemoteDataUrl } from "../../core/render/chartData";

/** The page colours a chart follows. */
export interface ChartTheme {
  readonly dark: boolean;
  readonly foreground: string;
  readonly muted: string;
  readonly grid: string;
  readonly accent: string;
  readonly fontFamily: string;
  /** The body font size in px; the chart text sizes are ratios of it. */
  readonly fontSize: number;
}

const LIGHT_CATEGORIES = ["#2f6db5", "#d9822b", "#3f9a68", "#b6455f", "#7a5ab8", "#2e9aa6", "#a08a1f", "#6b7280"];
const DARK_CATEGORIES = ["#6aa7e8", "#f0a85c", "#6fcf97", "#e57a93", "#a78bda", "#5cc8d4", "#d8c35a", "#9ca3af"];

// @implements_req SwRS-MDOKFSTUDIO-DIAG-123
/**
 * What a full Vega spec needs on top of {@link chartConfig}: Vega (unlike Vega-Lite) has no default
 * mark colour, so the marks that carry no colour of their own take the accent of the page.
 */
function vegaMarkColours(theme: ChartTheme): Record<string, unknown> {
  return {
    line: { stroke: theme.accent },
    area: { fill: theme.accent },
    rect: { fill: theme.accent },
    symbol: { fill: theme.accent },
    arc: { fill: theme.accent },
    trail: { fill: theme.accent },
  };
}

const round1 = (value: number): number => Math.round(value * 10) / 10;

// @implements_req SwRS-MDOKFSTUDIO-DIAG-123
/**
 * The Vega config that gives a chart the colours, the font and the text sizes of the page: every
 * size is a ratio of the body font size, so it follows the Markdown font size and the zoom.
 */
export function chartConfig(theme: ChartTheme): Record<string, unknown> {
  const categories = [theme.accent, ...(theme.dark ? DARK_CATEGORIES : LIGHT_CATEGORIES).slice(1)];
  const text = { color: theme.foreground, font: theme.fontFamily };
  const body = theme.fontSize;
  const legendLabel = round1(body * 0.93);
  const axisLabel = round1(body * 0.85);
  const titleSize = round1(body * 0.95);
  return {
    background: "transparent",
    font: theme.fontFamily,
    view: { stroke: "transparent" },
    title: {
      ...text,
      fontSize: round1(body * 1.15),
      fontWeight: "bold",
      subtitleColor: theme.foreground,
      subtitleFont: theme.fontFamily,
      subtitleFontSize: round1(body * 0.9),
    },
    axis: {
      domainColor: theme.muted,
      tickColor: theme.muted,
      gridColor: theme.grid,
      labelColor: theme.foreground,
      labelFont: theme.fontFamily,
      labelFontSize: axisLabel,
      titleColor: theme.foreground,
      titleFont: theme.fontFamily,
      titleFontSize: titleSize,
      titleFontWeight: "bold",
      titlePadding: round1(0.5 * axisLabel),
    },
    axisXDiscrete: { labelAngle: 0, labelOverlap: true },
    legend: {
      labelColor: theme.foreground,
      labelFont: theme.fontFamily,
      labelFontSize: legendLabel,
      titleColor: theme.foreground,
      titleFont: theme.fontFamily,
      titleFontSize: titleSize,
      titleFontWeight: "bold",
      symbolSize: Math.round(0.7 * legendLabel * legendLabel),
      symbolStrokeWidth: 2.5,
      rowPadding: round1(0.4 * legendLabel),
      titlePadding: round1(0.4 * axisLabel),
    },
    header: {
      labelColor: theme.foreground,
      titleColor: theme.foreground,
      labelFont: theme.fontFamily,
      titleFont: theme.fontFamily,
      labelFontSize: axisLabel,
      titleFontSize: titleSize,
    },
    mark: { color: theme.accent },
    text,
    range: { category: categories, ordinal: { scheme: "blues" } },
    // The preview creates no input widget of a spec's `bind` (live view, no host element for them).
    events: { bind: "none" },
  };
}

// @implements_req SwRS-MDOKFSTUDIO-DIAG-123
/**
 * The config given to Vega-Lite: {@link chartConfig} and the tooltip of every mark (its encoded
 * fields). A spec's own `tooltip` encoding, or `"tooltip": null` on a mark, wins over it.
 */
export function vegaLiteConfig(theme: ChartTheme): Record<string, unknown> {
  const config = chartConfig(theme);
  return { ...config, mark: { ...(config.mark as Record<string, unknown>), tooltip: true } };
}

/** The config given to `vega.parse` for a full Vega chart: no mark tooltip, a spec defines its own. */
export function vegaConfig(theme: ChartTheme): Record<string, unknown> {
  return { ...chartConfig(theme), ...vegaMarkColours(theme) };
}

// @implements_req SwRS-MDOKFSTUDIO-DIAG-122
/**
 * The loader of a chart: the files the host read are served by the url the spec names, anything
 * else is refused with a message (remote urls included), and only `data:image/` pictures pass.
 */
export function createChartLoader(chart: Partial<ChartFiles>): vega.Loader {
  const files = chart.files ?? {};
  const errors = chart.errors ?? {};
  const load = (uri: string): Promise<string> => {
    const url = uri.trim();
    if (Object.hasOwn(files, url)) return Promise.resolve(files[url]!);
    if (Object.hasOwn(errors, url)) return Promise.reject(new Error(errors[url]));
    return Promise.reject(new Error(isRemoteDataUrl(url)
      ? `Remote chart data is not loaded: ${url}. Use inline values or a file next to the document.`
      : `Chart data file ${url} was not read by the preview.`));
  };
  return {
    load,
    http: load,
    file: load,
    sanitize: (uri: string) => /^data:image\//iu.test(uri.trim())
      ? Promise.resolve({ href: uri.trim() })
      : Promise.reject(new Error(`Remote chart images are not loaded: ${uri}.`)),
  } as unknown as vega.Loader;
}
