/**
 * Draws one Vega-Lite or Vega chart for the preview page: a live SVG view mounted in a detached
 * element (`mountChart`), or an SVG string from a headless view (`drawChart`, the unit tests).
 *
 * The live view never calls `view.toSVG()` or the renderer's `svg()`: they re-set the `style`
 * attribute, which the page's Content Security Policy refuses. The renderer sets styles through the
 * CSSOM, which it allows.
 */
import * as vega from "vega";
import * as vegaLite from "vega-lite";
import { expressionInterpreter } from "vega-interpreter";

import { type ChartFiles, type ChartKind, parseChartSource } from "../../core/render/chartData";
import { inlineChartFiles } from "../../core/render/chartInline";
import { type ChartTheme, createChartLoader, vegaConfig, vegaLiteConfig } from "./vegaChart";

/** What a live chart is: its Vega view and the `div.myst-vega-view` it is drawn in. */
export interface MountedChart {
  readonly view: vega.View;
  readonly host: HTMLElement;
}

/** The Vega tooltip handler: `(handler, event, item, value)`. */
export type ChartTooltipHandler = (handler: unknown, event: MouseEvent, item: unknown, value: unknown) => void;

/** Parses `source`, inlines the files, compiles Vega-Lite and parses the Vega spec to an expression AST. */
export function chartRuntime(kind: ChartKind, source: string, theme: ChartTheme, chart: Partial<ChartFiles> = {}): vega.Runtime {
  const parsed = parseChartSource(source);
  if (!parsed.ok) throw new Error(parsed.error);
  const spec = inlineChartFiles(parsed.spec, chart);
  const vegaSpec = kind === "vega-lite"
    ? vegaLite.compile(spec as unknown as vegaLite.TopLevelSpec, { config: vegaLiteConfig(theme) as vegaLite.Config }).spec
    : spec;
  // @implements_req SwRS-MDOKFSTUDIO-DIAG-124
  return vega.parse(vegaSpec as vega.Spec, kind === "vega" ? vegaConfig(theme) : undefined, { ast: true });
}

/** Draws the chart of `source` (JSON or YAML) to SVG text; rejects with the reason when it cannot. */
export async function drawChart(
  kind: ChartKind,
  source: string,
  theme: ChartTheme,
  chart: Partial<ChartFiles> = {},
): Promise<string> {
  const view = new vega.View(chartRuntime(kind, source, theme, chart), {
    expr: expressionInterpreter,
    loader: createChartLoader(chart),
    renderer: "none",
    logLevel: vega.Error,
  });
  try {
    await view.runAsync();
    return await view.toSVG();
  } finally {
    view.finalize();
  }
}

// @implements_req SwRS-MDOKFSTUDIO-DIAG-123
/**
 * Draws the chart as a live SVG view in a new, detached `div.myst-vega-view`; rejects with the
 * reason when it cannot (the view is finalized first). The caller puts `host` in the page.
 */
export async function mountChart(
  kind: ChartKind,
  source: string,
  theme: ChartTheme,
  chart: Partial<ChartFiles>,
  tooltip: ChartTooltipHandler,
): Promise<MountedChart> {
  const view = new vega.View(chartRuntime(kind, source, theme, chart), {
    renderer: "svg",
    loader: createChartLoader(chart),
    expr: expressionInterpreter,
    logLevel: vega.Error,
    tooltip,
  });
  const host = document.createElement("div");
  host.className = "myst-vega-view";
  try {
    view.initialize(host);
    await view.runAsync();
  } catch (error) {
    view.finalize();
    throw error;
  }
  return { view, host };
}
