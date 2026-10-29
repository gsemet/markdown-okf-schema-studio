/**
 * Requirement test of the Mermaid labels as the user sees them: the page draws the diagram and
 * shows it as an SVG image, and an SVG image uses neither the page's style sheet nor its fonts.
 * The test opens the shown SVG on its own (an SVG document, the same context as the image) and
 * checks that the text of every node and edge label fits the box Mermaid measured for it in the
 * page. A label measured in one font and drawn in a wider one loses its last characters ("Yes|",
 * "Nc", "Hold and inspe"). It also checks that the in-page measure the real-window check uses
 * (`measureMermaidImageLabels`) sees the same as the image. Skipped, with a message, when no
 * Chromium can start here.
 */
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

import { cutLabels, measureMermaidImageLabels } from "../shared/mermaidImageLabels";
import { openPreviewPage } from "./chartPage";

const FLOWCHART_DOCUMENT = [
  "# Dispatch",
  "",
  "```mermaid",
  "flowchart LR",
  "  Review[Review telemetry] --> Ready{Ready?}",
  "  Ready -->|Yes| Dispatch[Dispatch fleet]",
  "  Ready -->|No| Hold[Hold and inspect]",
  "```",
  "",
].join("\n");

interface LabelFit {
  readonly label: string;
  readonly text: { readonly width: number; readonly right: number; readonly bottom: number };
  readonly box: { readonly width: number; readonly right: number; readonly bottom: number };
}

// @tests_req SwRS-MDOKFSTUDIO-DIAG-001
test("every Mermaid label fits its box in the shown image, not only in the page", async (t) => {
  for (const themeId of ["light", "dark"]) {
    const opened = await openPreviewPage(FLOWCHART_DOCUMENT, {}, themeId, undefined, "mermaid");
    if (!opened) {
      t.skip("no Chromium can start here (run `just dev` to install it)");
      return;
    }
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), "mermaid-label-fit-"));
    try {
      const { page, problems } = opened;
      await page.waitForFunction(() => document.querySelector<HTMLElement>(".myst-mermaid-diagram")?.dataset.renderState !== undefined,
        undefined, { timeout: 60_000 });
      const src = await page.locator("img.myst-mermaid-image").getAttribute("src") ?? "";
      assert.ok(src.startsWith("data:image/svg+xml"), `the diagram is shown as an SVG image: ${src.slice(0, 40)}`);

      // The SVG on its own: like the image, it has no page style sheet and no page fonts.
      const imagePath = path.join(folder, "diagram.svg");
      fs.writeFileSync(imagePath, decodeURIComponent(src.slice(src.indexOf(",") + 1)));
      const image = await opened.browser.newPage();
      await image.goto(pathToFileURL(imagePath).href);
      await image.evaluate(async () => { await document.fonts.ready; });
      const fits = await image.evaluate(() => {
        const rect = (element: Element | Range) => {
          const { width, right, bottom } = element.getBoundingClientRect();
          return { width, right, bottom };
        };
        return [...document.querySelectorAll("g.node, g.edgeLabel")].flatMap((group): LabelFit[] => {
          const box = group.querySelector("foreignObject");
          const label = box?.textContent?.trim() ?? "";
          if (!box || !label) return [];
          // The text alone: the line boxes of its text nodes, not the element boxes around it (a
          // block or table-cell box takes the width of the box, whatever the text).
          const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
          const lines: DOMRect[] = [];
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            const range = document.createRange();
            range.selectNodeContents(node);
            lines.push(...[...range.getClientRects()].filter((line) => line.width > 0));
          }
          const text = {
            width: Math.max(...lines.map((line) => line.right)) - Math.min(...lines.map((line) => line.left)),
            right: Math.max(...lines.map((line) => line.right)),
            bottom: Math.max(...lines.map((line) => line.bottom)),
          };
          return [{ label, text, box: rect(box) }];
        });
      });
      await image.close();

      assert.deepEqual(fits.map((fit) => fit.label).sort(),
        ["Dispatch fleet", "Hold and inspect", "No", "Ready?", "Review telemetry", "Yes"], `${themeId}: every label was found`);
      // The real-window check cannot open the image as a document: it measures in the page with
      // `measureMermaidImageLabels`, which must see what the image draws, cut labels included.
      const inPage = await page.evaluate(measureMermaidImageLabels, src);
      const overflow = (fit: LabelFit) => ({ label: fit.label, text: fit.text.width, box: fit.box.width, past: fit.text.right - fit.box.right });
      const near = (left: number, right: number) => Math.abs(left - right) <= 0.5;
      for (const fit of fits.map(overflow)) {
        const same = inPage.map(overflow).find((candidate) => candidate.label === fit.label);
        assert.ok(same && near(same.text, fit.text) && near(same.box, fit.box) && near(same.past, fit.past),
          `${themeId}: the in-page measure of "${fit.label}" matches the image: ${JSON.stringify({ image: fit, inPage: same })}`);
      }
      const cut = fits.filter((fit) => fit.text.right > fit.box.right + 0.5 || fit.text.bottom > fit.box.bottom + 0.5);
      assert.deepEqual(cut, [], `${themeId}: every label fits its box in the image: ${JSON.stringify(fits)}`);
      assert.deepEqual(cutLabels(inPage), [], `${themeId}: the real-window check passes too: ${JSON.stringify(inPage)}`);
      // The policy blocks the style sheet and style attributes Mermaid writes while it measures in
      // the page (the reason the page gives it a styled element to measure in): expected, and
      // reported by Chromium as console errors. Anything else is a problem.
      const unexpected = problems.filter((problem) => !problem.startsWith("console: Applying inline style violates"));
      assert.deepEqual(unexpected, [], `${themeId}: no other console error and no uncaught exception`);
    } finally {
      fs.rmSync(folder, { recursive: true, force: true });
      await opened.close();
    }
  }
});
