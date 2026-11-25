/**
 * Requirement test of the chart runtime in a real page: the document goes through the render
 * pipeline and the page builder (Content Security Policy included), headless Chromium opens it, and
 * both a Vega-Lite and a Vega chart (with a CSV file next to the document and expressions) are drawn
 * with no policy violation. Skipped, with a message, when no Chromium can start here.
 */
import * as assert from "node:assert/strict";
import { test } from "node:test";

import type { Browser, Page } from "playwright-core";

import { buildHtmlExport } from "../../src/core/export/htmlExport";
import { CHART_DATA, CHART_DOCUMENT, openChartPage, openPreviewPage } from "./chartPage";

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
      image: chart.querySelector("img.myst-vega-image")?.getAttribute("src")?.slice(0, 26),
      error: chart.querySelector(".myst-vega-error pre")?.textContent,
    })));
    assert.deepEqual(states.map((state) => state.state), ["rendered", "rendered", "rendered", "error"]);
    assert.equal(states[0]!.image, "data:image/svg+xml;charset");
    assert.equal(states[1]!.image, "data:image/svg+xml;charset");
    assert.equal(states[2]!.image, "data:image/svg+xml;charset", "the grouped bar chart added to the showcase by CR-502");
    assert.match(states[3]!.error ?? "", /neither valid JSON nor valid YAML/u, "the error shows in place of the chart");

    // The drawn pictures are real SVG with the axis text and the CSV rows.
    const svgs = await page.evaluate(async () => Promise.all([...document.querySelectorAll<HTMLImageElement>(".myst-vega-image")]
      .map(async (image) => decodeURIComponent(image.src.slice(image.src.indexOf(",") + 1)))));
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

// @tests_req SwRS-MDOKFSTUDIO-DIAG-123
test("a theme change draws the charts again in the colours of the new theme", async (t) => {
  const opened = await openChartPage(CHART_DOCUMENT, { "data/series.csv": CHART_DATA }, "light");
  if (!opened) {
    t.skip("no Chromium can start here (run `just dev` to install it)");
    return;
  }
  try {
    const { page } = opened;
    await page.waitForFunction(() => document.querySelectorAll(".myst-vega-diagram img").length === 3, undefined, { timeout: 30_000 });
    const svg = (): Promise<string> => page.evaluate(() => {
      const image = document.querySelector<HTMLImageElement>(".myst-vega-image")!;
      return decodeURIComponent(image.src.slice(image.src.indexOf(",") + 1));
    });
    const before = await svg();
    await page.evaluate(() => {
      document.body.style.setProperty("--vscode-editor-background", "#1f1f1f");
      document.body.style.setProperty("--vscode-editor-foreground", "#f4f4f4");
    });
    await page.waitForFunction((was) => {
      const image = document.querySelector<HTMLImageElement>(".myst-vega-image");
      return image !== null && decodeURIComponent(image.src.slice(image.src.indexOf(",") + 1)) !== was;
    }, before, { timeout: 30_000 });
    assert.match(await svg(), /#f4f4f4/iu, "the axis text takes the new foreground");
  } finally {
    await opened.close();
  }
});

const FILES = { "data/series.csv": CHART_DATA };

/** The SVG text of every drawn chart, in document order. */
const drawnSvgs = (page: Page): Promise<string[]> => page.evaluate(() => [...document.querySelectorAll<HTMLImageElement>(".myst-vega-image")]
  .map((image) => decodeURIComponent(image.src.slice(image.src.indexOf(",") + 1))));

/** The font sizes of the text elements of `svg` whose content starts with `label`. */
function fontSizesOf(svg: string, label: string): number[] {
  return [...svg.matchAll(/<text[^>]*>/gu)]
    .filter((match) => svg.slice(match.index + match[0].length).startsWith(label))
    .map((match) => Number(/font-size[:=]\s*"?([\d.]+)/u.exec(match[0])?.[1] ?? Number.NaN));
}

const legendSize = async (page: Page): Promise<number> => fontSizesOf((await drawnSvgs(page))[2]!, "Basic")[0]!;

// @tests_req SwRS-MDOKFSTUDIO-DIAG-123
test("the chart text follows the page text size and the zoom, and the Quarter labels are horizontal", async (t) => {
  const opened = await openChartPage(CHART_DOCUMENT, FILES, "light", "cream");
  if (!opened) {
    t.skip("no Chromium can start here (run `just dev` to install it)");
    return;
  }
  try {
    const { page, problems } = opened;
    await page.waitForFunction(() => document.querySelectorAll(".myst-vega-diagram img").length === 3, undefined, { timeout: 30_000 });
    assert.equal(await page.evaluate(() => getComputedStyle(document.body).fontSize), "14px");
    assert.equal(await legendSize(page), 13, "the legend label is 0.93 of the 14 px body text");
    const grouped = (await drawnSvgs(page))[2]!;
    assert.deepEqual(fontSizesOf(grouped, "Q1"), [11.9], "the axis label is 0.85 of the body text");
    const quarter = [...grouped.matchAll(/<text[^>]*>(?=Q[1-4]<)/gu)].map((match) => match[0]);
    assert.equal(quarter.length, 4);
    assert.ok(quarter.every((text) => !/rotate/u.test(text)), "the Quarter labels carry no rotation");

    // The Markdown font size, then the zoom, redraw the charts with bigger text.
    await page.evaluate(() => document.documentElement.style.setProperty("--studio-markdown-font-size", "18px"));
    await page.waitForFunction(() => getComputedStyle(document.body).fontSize === "18px");
    await page.waitForFunction(() => /font-size[:=]\s*"?16\.7/u.test(decodeURIComponent(document.querySelectorAll<HTMLImageElement>(".myst-vega-image")[2]!.src)), undefined, { timeout: 30_000 });
    assert.equal(await legendSize(page), 16.7);
    assert.deepEqual(fontSizesOf((await drawnSvgs(page))[2]!, "Q1"), [15.3]);
    // The zoom buttons belong to the toolbar, which this page has not; viewControls sets this variable.
    await page.evaluate(() => document.documentElement.style.setProperty("--sphinx-preview-zoom", "1.5"));
    await page.waitForFunction(() => getComputedStyle(document.body).fontSize === "27px");
    await page.waitForFunction(() => /font-size[:=]\s*"?25/u.test(decodeURIComponent(document.querySelectorAll<HTMLImageElement>(".myst-vega-image")[2]!.src)), undefined, { timeout: 30_000 });
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
test("the HTML export shows each Chart source section again, closed, and keeps the charts as images", async (t) => {
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
    assert.equal(await exported.evaluate(() => document.querySelectorAll("img.myst-vega-image").length), 3);
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
