/**
 * Screenshots of the chart page (`node out/test/probe/chartShots.js <folder>`): the Vega-Lite and
 * Vega charts of `test/page/chartPage.ts`, headless Chromium, a real page with its Content Security
 * Policy, in the Cream preview, a dark theme and the page with the failing chart (the error shown
 * in place). Writes `chart-cream.png`, `chart-dark.png` and `chart-error-cream.png`, and the same
 * charts with the pointer on a bar of the grouped bar chart and the hover detail shown:
 * `chart-hover-cream.png` and `chart-hover-dark.png`.
 */
import * as fs from "node:fs";
import * as path from "node:path";

import { CHART_DATA, CHART_DOCUMENT, CHART_SHOWCASE_DOCUMENT, openChartPage } from "../page/chartPage";

async function shoot(folder: string, name: string, markdown: string, theme: string, mode: string | undefined, hover = false): Promise<void> {
  const opened = await openChartPage(markdown, { "data/series.csv": CHART_DATA }, theme, mode);
  if (!opened) throw new Error("no Chromium can start here");
  try {
    const { page } = opened;
    const drawn = markdown === CHART_DOCUMENT ? 4 : 3;
    await page.waitForFunction((count) => document.querySelectorAll(".myst-vega-diagram[data-render-state]").length === count, drawn, { timeout: 30_000 });
    await page.setViewportSize({ width: 820, height: hover ? 1100 : 1000 });
    const height = await page.evaluate(() => Math.ceil([...document.querySelectorAll(".myst-vega-figure")].at(-1)!.getBoundingClientRect().bottom + window.scrollY) + 28);
    if (hover) {
      // The pointer on a bar of the grouped bar chart (the third chart): the hover detail shows beside it.
      const bar = await page.locator(".myst-vega-diagram").nth(2).locator("g.mark-rect.role-mark path").first().boundingBox();
      if (!bar) throw new Error("the grouped bar chart has no bar");
      await page.mouse.move(bar.x + bar.width / 2 - 4, bar.y + bar.height / 2 - 4);
      await page.mouse.move(bar.x + bar.width / 2, bar.y + bar.height / 2);
      await page.waitForFunction(() => {
        const box = document.querySelector(".myst-vega-tooltip");
        return box !== null && !box.hasAttribute("hidden");
      }, undefined, { timeout: 5_000 });
    }
    await page.screenshot({ path: path.join(folder, name), clip: { x: 0, y: 0, width: 820, height: hover ? height + 70 : height } });
    const violations = await page.evaluate(() => (window as unknown as { __violations: string[] }).__violations);
    if (violations.length > 0 || opened.problems.length > 0) throw new Error(`page problems: ${JSON.stringify([...violations, ...opened.problems])}`);
  } finally {
    await opened.close();
  }
}

async function main(): Promise<void> {
  const folder = path.resolve(process.argv[2] ?? "chart-shots");
  fs.mkdirSync(folder, { recursive: true });
  await shoot(folder, "chart-cream.png", CHART_SHOWCASE_DOCUMENT, "light", "cream");
  await shoot(folder, "chart-dark.png", CHART_SHOWCASE_DOCUMENT, "dark", undefined);
  await shoot(folder, "chart-hover-cream.png", CHART_SHOWCASE_DOCUMENT, "light", "cream", true);
  await shoot(folder, "chart-hover-dark.png", CHART_SHOWCASE_DOCUMENT, "dark", undefined, true);
  await shoot(folder, "chart-error-cream.png", CHART_DOCUMENT, "light", "cream");
  console.log(`wrote the chart screenshots to ${folder}`);
}

void main();
