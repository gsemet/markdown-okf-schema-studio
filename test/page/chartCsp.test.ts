/**
 * Requirement test of the chart runtime in a real page: the document goes through the render
 * pipeline and the page builder (Content Security Policy included), headless Chromium opens it, and
 * both a Vega-Lite and a Vega chart (with a CSV file next to the document and expressions) are drawn
 * as live SVG views with no policy violation, with a hover detail. Skipped, with a message, when no
 * Chromium can start here.
 */
import * as assert from "node:assert/strict";
import * as path from "node:path";
import { test } from "node:test";

import { build } from "esbuild";
import type { Browser, Page } from "playwright-core";

import type { ExportSnapshot } from "../../src/core/export/exportSnapshot";
import { buildHtmlExport } from "../../src/core/export/htmlExport";
import { CHART_DATA, CHART_DOCUMENT, CHART_EXPORT_DOCUMENT, CHART_SHOWCASE_DOCUMENT, openChartPage, openPreviewPage } from "./chartPage";

// @tests_req SwRS-MDOKFSTUDIO-DIAG-121
// @tests_req SwRS-MDOKFSTUDIO-DIAG-122
// @tests_req SwRS-MDOKFSTUDIO-DIAG-123
// @tests_req SwRS-MDOKFSTUDIO-DIAG-124
test("a Vega-Lite and a Vega chart are drawn under the page's Content Security Policy, with no eval violation", async (t) => {
  const opened = await openChartPage(CHART_DOCUMENT, { "data/series.csv": CHART_DATA }, "light", "cream");
  if (!opened) {
    t.skip("no Chromium can start here (run `just dev` to install it)");
    return;
  }
  try {
    const { page, csp, problems } = opened;
    assert.match(csp, /script-src [^;]*'nonce-/u);
    assert.doesNotMatch(csp, /unsafe-eval|unsafe-inline/u, "the policy keeps no eval");
    assert.match(csp, /connect-src 'none'/u);

    await page.waitForFunction(() => document.querySelectorAll(".myst-vega-diagram[data-render-state]").length === 4, undefined, { timeout: 30_000 });
    const states = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".myst-vega-diagram")].map((chart) => ({
      state: chart.dataset.renderState,
      view: chart.querySelector(":scope > .myst-vega-view > svg") !== null,
      image: chart.querySelector("img") !== null,
      label: chart.getAttribute("aria-label"),
      kind: chart.getAttribute("data-myst-chart-kind"),
      error: chart.querySelector(".myst-vega-error pre")?.textContent,
    })));
    assert.deepEqual(states.map((state) => state.state), ["rendered", "rendered", "rendered", "error"]);
    // Changed for CR-503: the chart is a live SVG in a view now, not a data-URL image.
    assert.deepEqual(states.slice(0, 3).map((state) => [state.view, state.image, state.label]), Array.from({ length: 3 }, () => [true, false, "Chart diagram"]),
      "each drawn chart is .myst-vega-diagram > .myst-vega-view > svg and keeps its label (the grouped bar chart was added by CR-502)");
    assert.deepEqual(states.slice(0, 3).map((state) => state.kind), ["vega-lite", "vega", "vega-lite"], "the data attributes stay");
    assert.match(states[3]!.error ?? "", /neither valid JSON nor valid YAML/u, "the error shows in place of the chart");

    // The drawn pictures are real SVG with the axis text and the CSV rows.
    const svgs = await drawnSvgs(page);
    assert.match(svgs[0]!, /Revenue by region/u);
    assert.match(svgs[0]!, /South/u);
    assert.doesNotMatch(svgs[0]!, /North/u, "the expression filter ran (28000 is not above 30000)");
    assert.match(svgs[1]!, /Jun/u, "the Vega chart drew the rows of data/series.csv");
    assert.equal(await page.evaluate(() => document.querySelectorAll(".myst-vega-figure details.myst-vega-source").length), 4, "four charts since CR-502 added the grouped bar chart");

    const violations = await page.evaluate(() => (window as unknown as { __violations: string[] }).__violations);
    assert.deepEqual(violations, [], "no Content Security Policy violation");
    assert.deepEqual(problems, [], "no console error and no uncaught exception");

    // The control: this page really refuses code built from a string, and the detector sees it.
    await page.evaluate(() => { setTimeout("window.__evalRan = true", 0); });
    await page.waitForFunction(() => (window as unknown as { __violations: string[] }).__violations.length > 0, undefined, { timeout: 5_000 });
    assert.equal(await page.evaluate(() => (window as unknown as { __evalRan?: boolean }).__evalRan), undefined);
    assert.match((await page.evaluate(() => (window as unknown as { __violations: string[] }).__violations))[0]!, /^script-src/u);
  } finally {
    await opened.close();
  }
});

const FILES = { "data/series.csv": CHART_DATA };

const VIEW_SVG = ".myst-vega-diagram > .myst-vega-view > svg";

/** The outer HTML of every drawn chart view, in document order. */
const drawnSvgs = (page: Page): Promise<string[]> => page.evaluate(() => [...document.querySelectorAll(".myst-vega-diagram > .myst-vega-view > svg")]
  .map((svg) => svg.outerHTML));

/** The font sizes of the text elements of `svg` whose content starts with `label`. */
function fontSizesOf(svg: string, label: string): number[] {
  return [...svg.matchAll(/<text[^>]*>/gu)]
    .filter((match) => svg.slice(match.index + match[0].length).startsWith(label))
    .map((match) => Number(/font-size[:=]\s*"?([\d.]+)/u.exec(match[0])?.[1] ?? Number.NaN));
}

const legendSize = async (page: Page): Promise<number> => fontSizesOf((await drawnSvgs(page))[2]!, "Basic")[0]!;

const waitDrawn = (page: Page, count: number): Promise<unknown> => page.waitForFunction(
  (expected) => document.querySelectorAll(".myst-vega-diagram > .myst-vega-view > svg").length === expected, count, { timeout: 30_000 });

/** Moves the mouse onto the first element of `selector` inside chart number `index`. */
async function hover(page: Page, index: number, selector: string): Promise<void> {
  const box = await page.locator(".myst-vega-diagram").nth(index).locator(selector).first().boundingBox();
  assert.ok(box, `${selector} is on the page`);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x - 4, y - 4);
  await page.mouse.move(x, y);
}

/** The shown hover box as rows of [key, value], or undefined while it is hidden or absent. */
const tooltipRows = (page: Page): Promise<string[][] | undefined> => page.evaluate(() => {
  const box = document.querySelector(".myst-vega-tooltip");
  if (!box || box.hasAttribute("hidden")) return undefined;
  return [...box.querySelectorAll(".myst-vega-tooltip-row")].map((row) => [...row.children].map((cell) => cell.textContent ?? ""));
});

const shownTooltip = (page: Page): Promise<unknown> => page.waitForFunction(() => {
  const box = document.querySelector(".myst-vega-tooltip");
  return box !== null && !box.hasAttribute("hidden");
}, undefined, { timeout: 5_000 });

const hiddenTooltip = (page: Page): Promise<unknown> => page.waitForFunction(() => {
  const box = document.querySelector(".myst-vega-tooltip");
  return box === null || box.hasAttribute("hidden");
}, undefined, { timeout: 5_000 });

// @tests_req SwRS-MDOKFSTUDIO-DIAG-123
test("a theme change draws the charts again in the new colours, and changing back shows the same view", async (t) => {
  const opened = await openChartPage(CHART_DOCUMENT, FILES, "light");
  if (!opened) {
    t.skip("no Chromium can start here (run `just dev` to install it)");
    return;
  }
  try {
    const { page, problems } = opened;
    await waitDrawn(page, 3);
    const svg = (): Promise<string> => page.evaluate((selector) => document.querySelector(selector)!.outerHTML, VIEW_SVG);
    const before = await svg();
    const original = await page.evaluate(() => ["--vscode-editor-background", "--vscode-editor-foreground"].map((name) => document.body.style.getPropertyValue(name)));
    await page.evaluate((selector) => {
      (document.querySelector(selector) as unknown as { __first: boolean }).__first = true;
      document.body.style.setProperty("--vscode-editor-background", "#1f1f1f");
      document.body.style.setProperty("--vscode-editor-foreground", "#f4f4f4");
    }, VIEW_SVG);
    await page.waitForFunction(({ selector, was }) => {
      const current = document.querySelector(selector);
      return current !== null && current.outerHTML !== was;
    }, { selector: VIEW_SVG, was: before }, { timeout: 30_000 });
    assert.match(await svg(), /#f4f4f4/iu, "the axis text takes the new foreground");
    assert.equal(await page.evaluate((selector) => (document.querySelector(selector) as unknown as { __first?: boolean }).__first, VIEW_SVG), undefined, "a new view for the new theme");

    // Changing back finds the first theme's view in the cache: the same svg element returns.
    await page.evaluate(([background, foreground]) => {
      document.body.style.setProperty("--vscode-editor-background", background!);
      document.body.style.setProperty("--vscode-editor-foreground", foreground!);
    }, original);
    await page.waitForFunction((selector) => (document.querySelector(selector) as unknown as { __first?: boolean }).__first === true, VIEW_SVG, { timeout: 30_000 });
    assert.deepEqual(problems, []);
  } finally {
    await opened.close();
  }
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-123
// @tests_req SwRS-MDOKFSTUDIO-DIAG-009
test("two identical charts each get their own view", async (t) => {
  const chart = CHART_DOCUMENT.slice(CHART_DOCUMENT.indexOf("```vega-lite"), CHART_DOCUMENT.indexOf("A Vega line chart"));
  const opened = await openChartPage(`${chart}\n${chart}`, FILES, "light", "cream");
  if (!opened) {
    t.skip("no Chromium can start here (run `just dev` to install it)");
    return;
  }
  try {
    const { page } = opened;
    await waitDrawn(page, 2);
    assert.equal(await page.evaluate((selector) => {
      const [first, second] = [...document.querySelectorAll(selector)];
      return first !== second && first!.isConnected && second!.isConnected;
    }, VIEW_SVG), true);
  } finally {
    await opened.close();
  }
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-123
test("hovering a mark shows its fields, the box follows the page colours, and leaving hides it", async (t) => {
  const opened = await openChartPage(CHART_DOCUMENT, FILES, "light", "cream");
  if (!opened) {
    t.skip("no Chromium can start here (run `just dev` to install it)");
    return;
  }
  try {
    const { page, problems } = opened;
    await waitDrawn(page, 3);
    assert.equal(await tooltipRows(page), undefined, "no box before a hover");

    await hover(page, 2, "g.mark-rect.role-mark path");
    await shownTooltip(page);
    const rows = await tooltipRows(page);
    assert.deepEqual(rows!.map((row) => row[0]).sort(), ["Product", "Product line", "Quarter", "Revenue (k$)"]);
    assert.ok(rows!.some((row) => row[0] === "Quarter" && /^Q[1-4]$/u.test(row[1]!)));
    assert.ok(rows!.some((row) => row[0] === "Revenue (k$)" && /^\d+$/u.test(row[1]!)));
    const look = await page.evaluate(() => {
      const box = document.querySelector(".myst-vega-tooltip")!;
      const style = getComputedStyle(box);
      const probe = document.createElement("div");
      probe.style.setProperty("background-color", getComputedStyle(document.body).getPropertyValue("--studio-editor-background"));
      document.body.appendChild(probe);
      const pageBackground = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return { background: style.backgroundColor, pageBackground, size: Number.parseFloat(style.fontSize), position: style.position, underBody: box.parentElement === document.body };
    });
    assert.equal(look.position, "fixed");
    assert.ok(look.underBody, "the box lives under the body");
    assert.ok(Math.abs(look.size - 13) < 1.1, `the box text size ${look.size} is the legend label size`);
    assert.equal(look.background, look.pageBackground, "the box background is the page background");

    await page.mouse.move(2, 2);
    await hiddenTooltip(page);

    // A symbol of the Vega chart shows its row, the line (no tooltip encoding) none.
    await hover(page, 1, "g.mark-symbol.role-mark path");
    await shownTooltip(page);
    assert.ok((await tooltipRows(page))!.some((row) => row[0] === "value"));
    await page.mouse.move(2, 2);
    await hiddenTooltip(page);
    await hover(page, 1, "g.mark-line.role-mark path");
    assert.equal(await tooltipRows(page), undefined, "the full Vega line has no tooltip");

    // A scroll hides a shown box.
    await hover(page, 2, "g.mark-rect.role-mark path");
    await shownTooltip(page);
    await page.evaluate(() => document.dispatchEvent(new Event("scroll")));
    await hiddenTooltip(page);

    assert.deepEqual(await page.evaluate(() => (window as unknown as { __violations: string[] }).__violations), [], "the hover broke no policy");
    assert.deepEqual(problems, []);
  } finally {
    await opened.close();
  }
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-123
test("a chart with tooltip null shows no box, and the box border is stronger on a dark page", async (t) => {
  const quiet = CHART_SHOWCASE_DOCUMENT.replace('"mark": "bar",\n  "encoding"', '"mark": { "type": "bar", "tooltip": null },\n  "encoding"');
  assert.match(quiet, /"tooltip": null/u, "the first chart carries the opt-out");
  const opened = await openChartPage(quiet, FILES, "light", "cream");
  if (!opened) {
    t.skip("no Chromium can start here (run `just dev` to install it)");
    return;
  }
  try {
    const { page } = opened;
    await waitDrawn(page, 3);
    await hover(page, 0, "g.mark-rect.role-mark path");
    assert.equal(await tooltipRows(page), undefined, "a chart with tooltip null shows no box");

    await hover(page, 2, "g.mark-rect.role-mark path");
    await shownTooltip(page);
    const border = (): Promise<string> => page.evaluate(() => getComputedStyle(document.querySelector(".myst-vega-tooltip")!).borderTopColor);
    const cream = await border();
    await page.mouse.move(2, 2);
    await hiddenTooltip(page);
    await page.evaluate(() => document.documentElement.setAttribute("data-sphinx-preview-theme-mode", "dark"));
    await hover(page, 2, "g.mark-rect.role-mark path");
    await shownTooltip(page);
    const dark = await border();
    assert.notEqual(dark, cream, "the dark border differs from the cream border");
    const background = await page.evaluate(() => getComputedStyle(document.querySelector(".myst-vega-tooltip")!).backgroundColor);
    assert.notEqual(dark, background, "the dark border is not the box background");
  } finally {
    await opened.close();
  }
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-123
test("in the current mode the box border is stronger over a VS Code dark theme, and in the White theme it is the page border", async (t) => {
  const opened = await openChartPage(CHART_DOCUMENT, FILES, "light", "current");
  if (!opened) {
    t.skip("no Chromium can start here (run `just dev` to install it)");
    return;
  }
  try {
    const { page } = opened;
    await waitDrawn(page, 3);
    const border = (): Promise<string> => page.evaluate(() => getComputedStyle(document.querySelector(".myst-vega-tooltip")!).borderTopColor);
    const showAndLeave = async (): Promise<string> => {
      await hover(page, 2, "g.mark-rect.role-mark path");
      await shownTooltip(page);
      const color = await border();
      await page.mouse.move(2, 2);
      await hiddenTooltip(page);
      return color;
    };
    const light = await showAndLeave();
    await page.evaluate(() => document.body.classList.add("vscode-dark"));
    const dark = await showAndLeave();
    assert.notEqual(dark, light, "the current mode over body.vscode-dark shows the dark border");
    const descriptionForeground = await page.evaluate(() => {
      const probe = document.createElement("div");
      probe.style.setProperty("color", getComputedStyle(document.body).getPropertyValue("--studio-descriptionForeground"));
      document.body.appendChild(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    });
    assert.equal(dark, descriptionForeground, "the dark border is the description foreground");

    // The White theme keeps the page border, whatever the VS Code theme class says.
    await page.evaluate(() => document.documentElement.setAttribute("data-sphinx-preview-theme-mode", "white"));
    const white = await showAndLeave();
    assert.notEqual(white, dark, "the White theme does not take the dark border");
    const pageBorder = await page.evaluate(() => {
      const probe = document.createElement("div");
      probe.style.setProperty("border", "1px solid var(--sphinx-preview-border)");
      document.body.appendChild(probe);
      const color = getComputedStyle(probe).borderTopColor;
      probe.remove();
      return color;
    });
    assert.equal(white, pageBorder, "the White theme shows the page border");
  } finally {
    await opened.close();
  }
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-123
test("a chart with an input binding draws no input widget", async (t) => {
  const bound = ["```vega-lite", JSON.stringify({
    width: 200,
    height: 100,
    data: { values: [{ a: "A", b: 3 }, { a: "B", b: 7 }] },
    params: [{ name: "cutoff", value: 2, bind: { input: "range", min: 0, max: 10, step: 1 } }],
    transform: [{ filter: "datum.b > cutoff" }],
    mark: "bar",
    encoding: { x: { field: "a", type: "nominal" }, y: { field: "b", type: "quantitative" } },
  }), "```", ""].join("\n");
  const opened = await openChartPage(bound, {}, "light", "cream");
  if (!opened) {
    t.skip("no Chromium can start here (run `just dev` to install it)");
    return;
  }
  try {
    const { page } = opened;
    await waitDrawn(page, 1);
    const widgets = await page.evaluate(() => ({
      inputs: document.querySelectorAll("input, select, textarea, form.vega-bindings, .vega-bind").length,
      besideSvg: document.querySelectorAll(".myst-vega-view > :not(svg)").length,
    }));
    assert.deepEqual(widgets, { inputs: 0, besideSvg: 0 }, "the bound parameter makes no widget in the page");
  } finally {
    await opened.close();
  }
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-123
test("on a narrow page the scaled chart still finds the mark under the pointer and shows the box", async (t) => {
  const opened = await openPreviewPage(CHART_DOCUMENT, FILES, "light", "cream", "vega", { viewport: { width: 300, height: 1300 } });
  if (!opened) {
    t.skip("no Chromium can start here (run `just dev` to install it)");
    return;
  }
  try {
    const { page } = opened;
    await waitDrawn(page, 3);
    const sizes = await page.evaluate(() => {
      const svg = document.querySelectorAll(".myst-vega-diagram > .myst-vega-view > svg")[2]!;
      return { shown: svg.getBoundingClientRect().width, drawn: Number(svg.getAttribute("width")) };
    });
    assert.ok(sizes.shown < sizes.drawn, `the chart is scaled down: ${sizes.shown} of ${sizes.drawn}`);
    await hover(page, 2, "g.mark-rect.role-mark path");
    await shownTooltip(page);
    const rows = await tooltipRows(page);
    assert.ok(rows!.some((row) => row[0] === "Quarter"), "the scaled chart still names the mark under the pointer");
  } finally {
    await opened.close();
  }
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-123
test("a chart in error has no view and shows no hover box", async (t) => {
  const opened = await openChartPage(CHART_DOCUMENT, FILES, "light", "cream");
  if (!opened) {
    t.skip("no Chromium can start here (run `just dev` to install it)");
    return;
  }
  try {
    const { page } = opened;
    await waitDrawn(page, 3);
    await page.waitForFunction(() => document.querySelectorAll(".myst-vega-diagram[data-render-state=error]").length === 1, undefined, { timeout: 30_000 });
    assert.equal(await page.evaluate(() => document.querySelector(".myst-vega-diagram[data-render-state=error] .myst-vega-view")), null, "the chart in error has no view");
    const box = await page.locator(".myst-vega-diagram[data-render-state=error] .myst-vega-error").first().boundingBox();
    assert.ok(box, "the error message is on the page");
    await page.mouse.move(box.x + 4, box.y + 4);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    assert.equal(await tooltipRows(page), undefined, "the error message shows no box");
  } finally {
    await opened.close();
  }
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-123
test("the chart text follows the page text size, and the Quarter labels are horizontal", async (t) => {
  const opened = await openChartPage(CHART_DOCUMENT, FILES, "light", "cream");
  if (!opened) {
    t.skip("no Chromium can start here (run `just dev` to install it)");
    return;
  }
  try {
    const { page, problems } = opened;
    await waitDrawn(page, 3);
    assert.equal(await page.evaluate(() => getComputedStyle(document.body).fontSize), "14px");
    assert.equal(await legendSize(page), 13, "the legend label is 0.93 of the 14 px body text");
    const grouped = (await drawnSvgs(page))[2]!;
    assert.deepEqual(fontSizesOf(grouped, "Q1"), [11.9], "the axis label is 0.85 of the body text");
    const quarter = [...grouped.matchAll(/<text[^>]*>(?=Q[1-4]<)/gu)].map((match) => match[0]);
    assert.equal(quarter.length, 4);
    assert.ok(quarter.every((text) => !/rotate/u.test(text)), "the Quarter labels carry no rotation");

    // The Markdown font size redraws the charts with bigger text.
    await page.evaluate(() => document.documentElement.style.setProperty("--studio-markdown-font-size", "18px"));
    await page.waitForFunction(() => getComputedStyle(document.body).fontSize === "18px");
    await page.waitForFunction(() => /font-size[:=]\s*"?16\.7/u.test(document.querySelectorAll(".myst-vega-diagram > .myst-vega-view > svg")[2]!.outerHTML), undefined, { timeout: 30_000 });
    assert.equal(await legendSize(page), 16.7);
    assert.deepEqual(fontSizesOf((await drawnSvgs(page))[2]!, "Q1"), [15.3]);
    // The zoom buttons belong to the toolbar, which this page has not; viewControls sets this variable.
    await page.evaluate(() => document.documentElement.style.setProperty("--sphinx-preview-zoom", "1.5"));
    await page.waitForFunction(() => getComputedStyle(document.body).fontSize === "27px");
    await page.waitForFunction(() => /font-size[:=]\s*"?25/u.test(document.querySelectorAll(".myst-vega-diagram > .myst-vega-view > svg")[2]!.outerHTML), undefined, { timeout: 30_000 });
    assert.equal(await legendSize(page), 25.1);

    // The subtitle takes the label colour of the page.
    const foreground = await page.evaluate(() => getComputedStyle(document.body).getPropertyValue("--studio-editor-foreground").trim());
    const subtitle = /<text[^>]*>(?=Grouped bars, in k\$<)/u.exec((await drawnSvgs(page))[2]!)?.[0] ?? "";
    assert.ok(subtitle.toLowerCase().includes(foreground.toLowerCase()), `the subtitle is drawn in ${foreground}: ${subtitle}`);
    assert.deepEqual(problems, []);
  } finally {
    await opened.close();
  }
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-121
test("the Chart source section is hidden in the preview, in reading and edit mode, and the broken chart keeps its message", async (t) => {
  const opened = await openChartPage(CHART_DOCUMENT, FILES, "light", "cream");
  if (!opened) {
    t.skip("no Chromium can start here (run `just dev` to install it)");
    return;
  }
  try {
    const { page } = opened;
    await page.waitForFunction(() => document.querySelectorAll(".myst-vega-diagram[data-render-state]").length === 4, undefined, { timeout: 30_000 });
    const displays = (): Promise<string[]> => page.evaluate(() => [...document.querySelectorAll("details.myst-vega-source")].map((source) => getComputedStyle(source).display));
    assert.deepEqual(await displays(), ["none", "none", "none", "none"], "reading mode: a drawn chart and the broken chart show no source");
    await page.evaluate(() => document.documentElement.setAttribute("data-sphinx-preview-edit-mode", "true"));
    assert.deepEqual(await displays(), ["none", "none", "none", "none"], "edit mode");
    const error = await page.evaluate(() => ({
      message: document.querySelector(".myst-vega-error > p")?.textContent,
      reason: document.querySelector(".myst-vega-error pre")?.textContent,
    }));
    assert.equal(error.message, "Unable to render the chart.");
    assert.match(error.reason ?? "", /neither valid JSON nor valid YAML/u);
  } finally {
    await opened.close();
  }
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-121
test("the HTML export shows each Chart source section again, closed, and keeps the charts as inline SVG", async (t) => {
  const opened = await openChartPage(CHART_DOCUMENT, FILES, "light", "cream");
  if (!opened) {
    t.skip("no Chromium can start here (run `just dev` to install it)");
    return;
  }
  try {
    const { page, browser } = opened;
    await page.waitForFunction(() => document.querySelectorAll(".myst-vega-diagram[data-render-state]").length === 4, undefined, { timeout: 30_000 });
    const snapshot = await page.evaluate(() => ({
      contentHtml: document.querySelector("#sphinx-myst-preview-content")!.outerHTML,
      rootAttributes: {} as Record<string, string>,
      tokens: {} as Record<string, string>,
      mathStyles: "",
      shownTabs: [] as number[],
    }));
    const { html } = buildHtmlExport(snapshot, { stem: "chart", maxContentWidth: 0, imageData: () => undefined });
    const exported = await browser.newPage();
    await exported.setContent(html);
    const sources = await exported.evaluate(() => [...document.querySelectorAll<HTMLDetailsElement>("details.myst-vega-source")]
      .map((source) => ({ open: source.open, display: getComputedStyle(source).display })));
    assert.deepEqual(sources, Array.from({ length: 4 }, () => ({ open: false, display: "block" })));
    assert.equal(await exported.evaluate(() => document.querySelectorAll(".myst-vega-diagram > .myst-vega-view > svg").length), 3);
  } finally {
    await opened.close();
  }
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-128
test("the HTML export keeps each chart as inline SVG with local gradients, no hover box and no script", async (t) => {
  const opened = await openChartPage(CHART_EXPORT_DOCUMENT, FILES, "light", "cream");
  if (!opened) {
    t.skip("no Chromium can start here (run `just dev` to install it)");
    return;
  }
  try {
    const { page, browser } = opened;
    await waitDrawn(page, 4);
    // Hover once so the page owns a hover box: the export must not carry it.
    await hover(page, 2, "g.mark-rect.role-mark path");
    await shownTooltip(page);
    const taken = await build({
      stdin: { contents: 'import { takeExportSnapshot } from "./src/page/modules/exportSnapshot"; globalThis.__snapshot = () => takeExportSnapshot(document, window);', resolveDir: path.resolve(__dirname, "../.."), loader: "ts" },
      bundle: true, write: false, platform: "browser", format: "iife", logLevel: "silent",
    });
    const snapshot = await page.evaluate(`${taken.outputFiles[0]!.text}\n__snapshot()`) as ExportSnapshot;
    assert.doesNotMatch(snapshot.contentHtml, /url\([^)#]+#gradient_/u, "no gradient reference keeps the page URL");
    const { html } = buildHtmlExport(snapshot, { stem: "chart", maxContentWidth: 0, imageData: () => undefined });
    assert.doesNotMatch(html, /<script/iu, "the export carries no script");
    assert.doesNotMatch(html, /<[^>]*myst-vega-tooltip/u, "the export carries no hover box element");
    const exported = await browser.newPage();
    await exported.setContent(html);
    const state = await exported.evaluate(() => {
      const references = [...document.querySelectorAll(".myst-vega-view svg [fill], .myst-vega-view svg [stroke]")]
        .flatMap((element) => [element.getAttribute("fill"), element.getAttribute("stroke")])
        .filter((value): value is string => value !== null && value.startsWith("url("));
      const area = document.querySelector(".myst-vega-view g.mark-area.role-mark path");
      return {
        views: document.querySelectorAll(".myst-vega-diagram > .myst-vega-view > svg").length,
        references,
        defined: references.every((reference) => document.getElementById(/^url\(#([^)]+)\)$/u.exec(reference)![1]!) !== null),
        areaFill: area ? getComputedStyle(area).fill : undefined,
      };
    });
    assert.equal(state.views, 4);
    assert.ok(state.references.length > 0, "the area chart has a gradient reference");
    assert.ok(state.references.every((reference) => /^url\(#[^)]+\)$/u.test(reference)), `local references: ${state.references.join(" ")}`);
    assert.ok(state.defined, "every referenced gradient is in the same file");
    assert.match(state.areaFill ?? "", /^url\(.*#gradient_/u, "the area is painted with its gradient");
  } finally {
    await opened.close();
  }
});

const posted = (page: Page): Promise<Array<{ type: string; activation?: string }>> => page.evaluate(() => (window as unknown as { __posted: Array<{ type: string; activation?: string }> }).__posted);

// @tests_req SwRS-MDOKFSTUDIO-DIAG-123
test("in the page runtime a chart redraws with the zoom, opens the editor in edit mode and reveals in reading mode", async (t) => {
  const opened = await openChartPage(CHART_DOCUMENT, FILES, "light", "cream", { pageRuntime: true });
  if (!opened) {
    t.skip("no Chromium can start here (run `just dev` to install it)");
    return;
  }
  try {
    const { page, problems } = opened;
    await waitDrawn(page, 3);
    const before = await legendSize(page);
    assert.equal(before, 13);
    for (let click = 0; click < 12 && await page.evaluate(() => document.documentElement.style.getPropertyValue("--sphinx-preview-zoom") !== "1.5"); click += 1) {
      await page.locator("[data-sphinx-preview-zoom-in]").click();
    }
    await page.waitForFunction(() => getComputedStyle(document.body).fontSize === "21px", undefined, { timeout: 10_000 });
    await page.waitForFunction(() => /font-size[:=]\s*"?19\.5/u.test(document.querySelectorAll(".myst-vega-diagram > .myst-vega-view > svg")[2]!.outerHTML), undefined, { timeout: 30_000 });
    assert.ok(await legendSize(page) > before, "the legend grew with the zoom");
    await hover(page, 2, "g.mark-rect.role-mark path");
    await shownTooltip(page);
    const boxSize = await page.evaluate(() => Number.parseFloat(getComputedStyle(document.querySelector(".myst-vega-tooltip")!).fontSize));
    assert.ok(boxSize > 13, `the hover box text grew with the zoom: ${boxSize}`);

    // Reading mode: a click on the chart asks the host to reveal its source.
    await page.mouse.click(5, 5);
    const sent = (await posted(page)).length;
    await hover(page, 2, "g.mark-rect.role-mark path");
    await page.locator(".myst-vega-diagram").nth(2).locator("svg").click({ position: { x: 4, y: 4 } });
    await page.waitForFunction((count) => (window as unknown as { __posted: unknown[] }).__posted.length > count, sent, { timeout: 5_000 });
    assert.ok((await posted(page)).slice(sent).some((message) => message.type === "previewReveal"), "reading mode reveals the source");
    assert.ok(!(await posted(page)).some((message) => message.type === "previewEditOpen"));

    // Edit mode: the same click opens the block editor.
    await page.locator("[data-sphinx-preview-edit-toggle]").click();
    const afterToggle = (await posted(page)).length;
    await page.locator(".myst-vega-diagram").nth(2).locator("svg").click({ position: { x: 4, y: 4 } });
    await page.waitForFunction((count) => (window as unknown as { __posted: Array<{ type: string }> }).__posted.slice(count).some((message) => message.type === "previewEditOpen"), afterToggle, { timeout: 5_000 });
    assert.deepEqual(problems, []);
  } finally {
    await opened.close();
  }
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-123
test("in the page runtime the find skips the chart text, and a content patch keeps the drawn views", async (t) => {
  const opened = await openChartPage(CHART_DOCUMENT, FILES, "light", "cream", { pageRuntime: true });
  if (!opened) {
    t.skip("no Chromium can start here (run `just dev` to install it)");
    return;
  }
  try {
    const { page, problems, html } = opened;
    await waitDrawn(page, 3);
    await page.keyboard.press("Control+F");
    const field = page.locator("[data-find-input]");
    await field.waitFor({ timeout: 5_000 });
    const count = async (word: string): Promise<string> => {
      await field.fill(word);
      await page.waitForFunction((expected) => document.querySelector("[data-find-count]")!.textContent !== "" && document.querySelector("[data-find-input]")!.getAttribute("aria-invalid") === "false" && expected !== undefined, word, { timeout: 5_000 });
      return page.evaluate(() => document.querySelector("[data-find-count]")!.textContent ?? "");
    };
    assert.match(await count("Product line"), /^No results/iu, "a word only in a chart legend finds nothing");
    assert.match(await count("Sales"), /^1 of 1/u, "a word of the page text finds its match");
    await page.keyboard.press("Escape");

    // A content patch with one more paragraph keeps the drawn views of the unchanged charts.
    const content = /<main\s+id="sphinx-myst-preview-content"[^>]*>([\s\S]*)<\/main>/u.exec(html)![1]!;
    await page.evaluate((selector) => {
      document.querySelectorAll(selector).forEach((svg, index) => { (svg as unknown as { __kept: number }).__kept = index + 1; });
    }, VIEW_SVG);
    await page.evaluate((contentHtml) => {
      const ready = (window as unknown as { __posted: Array<{ type: string; documentId: string }> }).__posted.find((message) => message.type === "previewReady")!;
      const identity = { documentId: ready.documentId, revision: 1, requestId: 1 };
      window.dispatchEvent(new MessageEvent("message", {
        data: { type: "previewContentPatch", ...identity, next: { revision: 2, requestId: 2 }, contentHtml, status: "success", label: "ok", diagnostics: [] },
      }));
    }, `${content}<p id="added-by-patch">Added by a patch.</p>`);
    await page.waitForFunction(() => document.getElementById("added-by-patch") !== null, undefined, { timeout: 10_000 });
    assert.deepEqual(await page.evaluate((selector) => [...document.querySelectorAll(selector)].map((svg) => (svg as unknown as { __kept?: number }).__kept), VIEW_SVG), [1, 2, 3], "the unchanged charts keep their view");
    assert.deepEqual(problems, []);
  } finally {
    await opened.close();
  }
});

test("Opening a chart page closes the browser when its setup fails", async (t) => {
  const kept: { browser?: Browser } = {};
  try {
    let opened: Awaited<ReturnType<typeof openPreviewPage>>;
    try {
      // A theme that does not exist fails the setup after the launch, the new page and the goto.
      opened = await openPreviewPage(CHART_DOCUMENT, { "data/series.csv": CHART_DATA }, "no-such-theme", undefined, "vega", {
        launched: (browser) => { kept.browser = browser; },
      });
    } catch {
      assert.ok(kept.browser, "the browser was launched before the setup failed");
      assert.equal(kept.browser.isConnected(), false, "openPreviewPage closed the browser when its setup failed");
      return;
    }
    if (!opened) {
      t.skip("no Chromium can start here (run `just dev` to install it)");
      return;
    }
    await opened.close();
    assert.fail("a theme that does not exist was accepted");
  } finally {
    if (kept.browser?.isConnected()) await kept.browser.close();
  }
});
