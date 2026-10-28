/**
 * The chart runtime of the preview page (bundled by esbuild into `out/bundle/vegaPreview.js`, like
 * Mermaid). The host adds this script only to a page that has a chart figure, so the Vega runtime
 * costs nothing on any other page. The page's Content Security Policy is unchanged: no eval (see
 * `vegaChart.ts`), no network (`connect-src 'none'`), a plain script from the extension.
 */
import type { ChartFiles, ChartKind } from "../../core/render/chartData";
import { chartThemeFrom } from "./chartTheme";
import { showChartError } from "./chartError";
import { createMermaidCache, diagramKey } from "./mermaidCache";
import { drawChart } from "./vegaChart";

const chartSelector = ".myst-vega-diagram";
// The key (theme, source and data) each chart node was last drawn with, and the drawings by key
// (PERF-07): unchanged charts are not drawn again by a content update or an attribute change.
const chartSources = new WeakMap<HTMLElement, string>();
const drawnKeys = new WeakMap<HTMLElement, string>();
const drawings = createMermaidCache();

function readJsonAttribute(chart: HTMLElement, name: string): Record<string, string> {
  try {
    const value: unknown = JSON.parse(chart.getAttribute(name) ?? "{}");
    return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, string> : {};
  } catch {
    return {};
  }
}

function showImage(chart: HTMLElement, src: string): void {
  const image = document.createElement("img");
  image.className = "myst-vega-image";
  image.alt = "Chart";
  image.src = src;
  chart.replaceChildren(image);
  chart.dataset.renderState = "rendered";
}

// @implements_req SwRS-MDOKFSTUDIO-DIAG-123
async function renderCharts(pending: readonly HTMLElement[]): Promise<void> {
  const theme = chartThemeFrom(
    (name) => getComputedStyle(document.body).getPropertyValue(name).trim(),
    getComputedStyle(document.body).backgroundColor,
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
    const plan = drawings.plan(chart.dataset.renderState === undefined ? undefined : drawnKeys.get(chart), key);
    if (plan.action === "keep") return;
    drawnKeys.set(chart, key);
    if (plan.action === "reuse") {
      showImage(chart, plan.image);
      return;
    }
    try {
      const svg = await drawChart(kind, source, theme, files);
      const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
      drawings.store(key, src);
      // A later pass (a newer theme) may have planned this node while the chart was drawn: the
      // drawing stays in the cache, but only the drawing of the node's current key is shown.
      if (drawnKeys.get(chart) === key) showImage(chart, src);
    } catch (error) {
      if (drawnKeys.get(chart) !== key) return;
      showChartError(chart, error instanceof Error ? error.message : String(error));
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
