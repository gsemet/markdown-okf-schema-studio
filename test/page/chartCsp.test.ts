/**
 * Requirement test of the chart runtime in a real page: the document goes through the render
 * pipeline and the page builder (Content Security Policy included), headless Chromium opens it, and
 * both a Vega-Lite and a Vega chart (with a CSV file next to the document and expressions) are drawn
 * with no policy violation. Skipped, with a message, when no Chromium can start here.
 */
import * as assert from "node:assert/strict";
import { test } from "node:test";

import { CHART_DATA, CHART_DOCUMENT, openChartPage } from "./chartPage";

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

    await page.waitForFunction(() => document.querySelectorAll(".myst-vega-diagram[data-render-state]").length === 3, undefined, { timeout: 30_000 });
    const states = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".myst-vega-diagram")].map((chart) => ({
      state: chart.dataset.renderState,
      image: chart.querySelector("img.myst-vega-image")?.getAttribute("src")?.slice(0, 26),
      error: chart.querySelector(".myst-vega-error pre")?.textContent,
    })));
    assert.deepEqual(states.map((state) => state.state), ["rendered", "rendered", "error"]);
    assert.equal(states[0]!.image, "data:image/svg+xml;charset");
    assert.equal(states[1]!.image, "data:image/svg+xml;charset");
    assert.match(states[2]!.error ?? "", /neither valid JSON nor valid YAML/u, "the error shows in place of the chart");

    // The drawn pictures are real SVG with the axis text and the CSV rows.
    const svgs = await page.evaluate(async () => Promise.all([...document.querySelectorAll<HTMLImageElement>(".myst-vega-image")]
      .map(async (image) => decodeURIComponent(image.src.slice(image.src.indexOf(",") + 1)))));
    assert.match(svgs[0]!, /Revenue by region/u);
    assert.match(svgs[0]!, /South/u);
    assert.doesNotMatch(svgs[0]!, /North/u, "the expression filter ran (28000 is not above 30000)");
    assert.match(svgs[1]!, /Jun/u, "the Vega chart drew the rows of data/series.csv");
    assert.equal(await page.evaluate(() => document.querySelectorAll(".myst-vega-figure details.myst-vega-source").length), 3);

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
    await page.waitForFunction(() => document.querySelectorAll(".myst-vega-diagram img").length === 2, undefined, { timeout: 30_000 });
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
