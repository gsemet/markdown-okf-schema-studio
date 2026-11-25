/**
 * The chart runtime of the preview page (bundled by esbuild into `out/bundle/vegaPreview.js`, like
 * Mermaid). The host adds this script only to a page that has a chart figure, so the Vega runtime
 * costs nothing on any other page. The page's Content Security Policy is unchanged: no eval (see
 * `vegaChart.ts`), no network (`connect-src 'none'`), a plain script from the extension.
 */
import type { View } from "vega";

import type { ChartFiles, ChartKind } from "../../core/render/chartData";
import { chartThemeFrom } from "./chartTheme";
import { showChartError } from "./chartError";
import { chartTooltip, hideChartTooltip } from "./chartTooltip";
import { createChartViewCache, type ChartViewEntry } from "./chartViewCache";
import { diagramKey } from "./mermaidCache";
import { mountChart } from "./vegaView";

/** A live chart view and the host it is drawn in. */
interface LiveChart extends ChartViewEntry {
  readonly view: View;
  readonly host: HTMLElement;
  /** The key the view was drawn for. */
  readonly key: string;
}

const chartSelector = ".myst-vega-diagram";
// The key (theme, source and data) each chart node was last drawn with, the view each node shows,
// and the views by key (PERF-07): unchanged charts are not drawn again by a content update or an
// attribute change, and a detached view is reused (DIAG-009).
const chartSources = new WeakMap<HTMLElement, string>();
const drawnKeys = new WeakMap<HTMLElement, string>();
const shownViews = new WeakMap<HTMLElement, LiveChart>();
const views = createChartViewCache<LiveChart>();

function readJsonAttribute(chart: HTMLElement, name: string): Record<string, string> {
  try {
    const value: unknown = JSON.parse(chart.getAttribute(name) ?? "{}");
    return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, string> : {};
  } catch {
    return {};
  }
}

const liveChart = (view: View, host: HTMLElement, key: string): LiveChart => ({
  view,
  host,
  key,
  isDetached: () => !host.isConnected,
  finalize: () => view.finalize(),
});

/**
 * The view a chart node showed is replaced (call it once the node no longer holds the old host):
 * it stays when it is the cache entry of its key, ready for reuse, else it is finalized.
 */
function releaseShown(chart: HTMLElement, next: LiveChart | undefined): void {
  const previous = shownViews.get(chart);
  hideChartTooltip();
  if (next === undefined) shownViews.delete(chart);
  else shownViews.set(chart, next);
  if (previous === undefined || previous === next) return;
  if (!views.holds(previous.key, previous)) previous.finalize();
}

function showView(chart: HTMLElement, live: LiveChart): void {
  chart.replaceChildren(live.host);
  releaseShown(chart, live);
  chart.dataset.renderState = "rendered";
}

// @implements_req SwRS-MDOKFSTUDIO-DIAG-123
async function renderCharts(pending: readonly HTMLElement[]): Promise<void> {
  const theme = chartThemeFrom(
    (name) => getComputedStyle(document.body).getPropertyValue(name).trim(),
    getComputedStyle(document.body).backgroundColor,
    getComputedStyle(document.body).fontSize,
  );
  await Promise.all(pending.map(async (chart) => {
    const source = chartSources.get(chart) ?? chart.textContent?.trim() ?? "";
    if (!source) return;
    chartSources.set(chart, source);
    const kind: ChartKind = chart.getAttribute("data-myst-chart-kind") === "vega" ? "vega" : "vega-lite";
    const files: ChartFiles = {
      files: readJsonAttribute(chart, "data-myst-chart-files"),
      errors: readJsonAttribute(chart, "data-myst-chart-errors"),
    };
    const key = diagramKey({ theme: JSON.stringify(theme) }, JSON.stringify([kind, source, files]));
    const previousKey = chart.dataset.renderState === undefined ? undefined : drawnKeys.get(chart);
    const plan = views.plan(previousKey, key);
    if (plan.action === "keep") return;
    drawnKeys.set(chart, key);
    if (plan.action === "reuse") {
      showView(chart, plan.entry);
      return;
    }
    try {
      const mounted = await mountChart(kind, source, theme, files, chartTooltip);
      const live = liveChart(mounted.view, mounted.host, key);
      views.store(key, live);
      // A later pass (a newer theme) may have planned this node while the chart was drawn: the
      // view stays in the cache, detached, but only the view of the node's current key is shown.
      if (drawnKeys.get(chart) === key) showView(chart, live);
    } catch (error) {
      if (drawnKeys.get(chart) !== key) return;
      showChartError(chart, error instanceof Error ? error.message : String(error));
      releaseShown(chart, undefined);
      chart.dataset.renderState = "error";
    }
  }));
}

let renderQueue = renderCharts(Array.from(document.querySelectorAll<HTMLElement>(chartSelector)));

document.addEventListener("studio:content-replaced", () => {
  renderQueue = renderQueue.then(() => renderCharts(
    Array.from(document.querySelectorAll<HTMLElement>(chartSelector))
      .filter((chart) => chart.dataset.renderState === undefined),
  ));
});

const themeObserver = new MutationObserver(() => {
  renderQueue = renderQueue.then(() => renderCharts(Array.from(document.querySelectorAll<HTMLElement>(chartSelector))));
});
themeObserver.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["data-sphinx-preview-theme-mode", "data-sphinx-preview-theme", "class", "style"],
});
themeObserver.observe(document.body, {
  attributes: true,
  attributeFilter: ["class", "style"],
});
