import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { type Frame, type Page } from "playwright-core";

import { withDocument } from "./common";
import {
  openStudioEditor,
  waitFor,
  waitForRender,
  withCurrentFrame,
  type Evidence,
} from "./harness";

const CHART_DOCUMENT = [
  "# Live chart",
  "",
  "A Vega-Lite bar chart:",
  "",
  "```vega-lite",
  JSON.stringify({
    title: "Revenue by region",
    data: { values: [{ region: "North", revenue: 28 }, { region: "South", revenue: 55 }, { region: "East", revenue: 43 }] },
    mark: "bar",
    encoding: {
      x: { field: "region", type: "nominal", title: "Region" },
      y: { field: "revenue", type: "quantitative", title: "Revenue" },
    },
  }, null, 2),
  "```",
  "",
].join("\n");

const CHART_SVG = ".myst-vega-diagram .myst-vega-view > svg";
const TOOLTIP = ".myst-vega-tooltip:not([hidden])";

/** Records, in the preview frame, every `securitypolicyviolation` the page raises from now on. */
async function listenForViolations(frame: Frame): Promise<void> {
  await frame.evaluate(() => {
    const holder = window as unknown as { __chartViolations?: string[] };
    if (holder.__chartViolations) return;
    holder.__chartViolations = [];
    document.addEventListener("securitypolicyviolation", (event) => {
      holder.__chartViolations!.push(`${event.violatedDirective} ${event.blockedURI}`);
    });
  });
}

const violationsOf = (frame: Frame): Promise<string[] | undefined> =>
  frame.evaluate(() => (window as unknown as { __chartViolations?: string[] }).__chartViolations);

/**
 * CR-503 (real VS Code window): a Vega-Lite chart in the Studio editor is a live `.myst-vega-view > svg`;
 * after one theme change (a redraw under a `securitypolicyviolation` listener) it is still one, the pointer
 * on a bar shows the hover detail with its fields and the page recorded no violation. The window is shot
 * with the box shown (`live-chart-hover.png` in the evidence folder), then captured as the registry asks.
 * @tests_req SwRS-MDOKFSTUDIO-DIAG-123#S2
 * @tests_req SwRS-MDOKFSTUDIO-DIAG-123#S4
 */
export async function scenarioLiveChart(page: Page, evidence: Evidence): Promise<void> {
  await withDocument("realinput-live-chart", CHART_DOCUMENT, async (document) => {
    await openStudioEditor(document.uri);
    await waitForRender(document);
    await waitFor("the chart to be drawn as a live svg", async () => await withCurrentFrame(page, async (frame) =>
      await frame.locator(CHART_SVG).count() === 1));

    await withCurrentFrame(page, listenForViolations);
    const before = await withCurrentFrame(page, (frame) => frame.locator(CHART_SVG).evaluate((svg) => svg.outerHTML));

    // One theme change: the chart is drawn again (a redraw under the listener).
    await withCurrentFrame(page, async (frame) => {
      await frame.locator("[data-sphinx-preview-theme-toggle]").click();
    });
    await waitFor("the chart to be drawn again in the new colours", async () => await withCurrentFrame(page, async (frame) => {
      const count = await frame.locator(CHART_SVG).count();
      return count === 1 && await frame.locator(CHART_SVG).evaluate((svg, was) => svg.outerHTML !== was, before);
    }));
    await withCurrentFrame(page, async (frame) => {
      assert.equal(await frame.locator(".myst-vega-diagram .myst-vega-view").count(), 1, "one live view in the chart");
      assert.equal(await frame.locator(".myst-vega-diagram img").count(), 0, "the chart is not an image");
      assert.deepEqual(await violationsOf(frame), [], "the redraw recorded no policy violation");
    });

    // The pointer on a bar: the hover detail shows its fields.
    const bar = await withCurrentFrame(page, (frame) => frame.locator(`${CHART_SVG} g.mark-rect.role-mark path`).first().boundingBox());
    assert.ok(bar, "the chart has a bar");
    await page.mouse.move(bar.x + bar.width / 2 - 4, bar.y + bar.height / 2 - 4);
    await page.mouse.move(bar.x + bar.width / 2, bar.y + bar.height / 2);
    await waitFor("the hover detail to show", async () => await withCurrentFrame(page, async (frame) =>
      await frame.locator(TOOLTIP).count() === 1));
    const rows = await withCurrentFrame(page, (frame) => frame.locator(`${TOOLTIP} .myst-vega-tooltip-row`).evaluateAll((elements) =>
      elements.map((element) => [...element.children].map((cell) => cell.textContent ?? ""))));
    assert.deepEqual(rows.map((row) => row[0]), ["Region", "Revenue"], `the hover detail lists the encoded fields: ${JSON.stringify(rows)}`);
    assert.ok(rows.every((row) => (row[1] ?? "") !== ""), `every row has a value: ${JSON.stringify(rows)}`);
    await withCurrentFrame(page, async (frame) => {
      assert.deepEqual(await violationsOf(frame), [], "the hover recorded no policy violation");
    });

    // The window with the box shown, taken here since `evidence.capture` moves the pointer away first.
    const hoverShot = path.join(evidence.directory, "diagrams", "live-chart-hover.png");
    fs.mkdirSync(path.dirname(hoverShot), { recursive: true });
    await page.screenshot({ path: hoverShot });

    await withCurrentFrame(page, async (frame) => {
      await evidence.capture(page, frame, "diagrams/r01-live-chart-hover",
        "A Vega-Lite chart in the Studio editor is a live SVG; after a theme change it is drawn again with no policy violation.");
      assert.deepEqual(await violationsOf(frame), [], "no policy violation at the end");
    });
  });
}
