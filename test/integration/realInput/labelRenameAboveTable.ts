import * as assert from "node:assert/strict";
import { type Page } from "playwright-core";

import { withDocument } from "./common";
import {
  bufferText,
  findCurrentFrame,
  openSidePreview,
  press,
  setEditMode,
  waitFor,
  waitForEditor,
  waitForRender,
  withCurrentFrame,
} from "./harness";

/** The head of the synth fixture `anchors-tables.md`: a heading, a paragraph, then a labelled table. */
const LABEL_ABOVE_TABLE_DOCUMENT = [
  "# Anchors and tables",
  "",
  "(intro-label)=",
  "## Heading with explicit id {#heading-id}",
  "",
  "A paragraph before the table, with a block id. ^para-before",
  "",
  "(table-label)=",
  "",
  "| Name | Value | Note |",
  "| --- | --- | --- |",
  "| alpha | 1 | first row ^row-a |",
  "| beta | 2 | second row |",
  "| gamma | 3 | third row |",
  "",
  "A paragraph right after the table. Reference {ref}`table-label` here. ^para-after",
  "",
].join("\n");

const CELL = "[data-sphinx-preview-table-cell-editor] textarea";

/**
 * QA replay 271-c1-1: the Rename label field of a table's label opens above the icon, clear of
 * every cell, and a click on a cell while it is open opens the cell editor in the same click.
 * @tests_req SwRS-MDOKFSTUDIO-MYST-038
 */
export async function scenarioLabelRenameAboveTable(page: Page): Promise<void> {
  await withDocument("realinput-label-above-table", LABEL_ABOVE_TABLE_DOCUMENT, async (source) => {
    await openSidePreview(source);
    await waitForRender(source);
    await setEditMode(page, true);

    await withCurrentFrame(page, (frame) => frame.locator(".okf-anchor[data-okf-label=\"table-label\"]").click());
    await waitFor("the rename field to open", async () => {
      const frame = await findCurrentFrame(page);
      return frame !== undefined && await frame.locator("[data-okf-label-rename]").count() === 1;
    });
    const report = await withCurrentFrame(page, (frame) => frame.evaluate(() => {
      const rect = (element: Element | null) => {
        const r = element?.getBoundingClientRect();
        return r === undefined ? null : { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
      };
      const field = document.querySelector("[data-okf-label-rename]")!;
      const box = field.getBoundingClientRect();
      const overlaps = Array.from(document.querySelectorAll("table td, table th")).filter((cell) => {
        const r = cell.getBoundingClientRect();
        return r.left < box.right && r.right > box.left && r.top < box.bottom && r.bottom > box.top;
      }).map((cell) => (cell.textContent ?? "").trim());
      return {
        overlaps,
        diagnostics: {
          side: field.getAttribute("data-okf-label-rename-side"),
          field: rect(field),
          icon: rect(document.querySelector(".okf-anchor[data-okf-label=\"table-label\"]")),
          table: rect(document.querySelector("table")),
          toolbar: rect(document.querySelector("[data-sphinx-preview-toolbar]")),
          scrollY: window.scrollY,
          viewport: { width: window.innerWidth, height: window.innerHeight },
        },
      };
    }));
    assert.deepEqual(
      report.overlaps,
      [],
      `the rename field covers no cell of the table: ${JSON.stringify(report.diagnostics)}`,
    );

    await withCurrentFrame(page, (frame) => frame.locator("td").filter({ hasText: /^alpha$/u }).click());
    await waitForEditor(page, CELL);
    await waitFor("the rename field to close on the press", async () => {
      const frame = await findCurrentFrame(page);
      return frame !== undefined && await frame.locator("[data-okf-label-rename]").count() === 0;
    });
    await press(page, "Escape");
    await waitFor("the cell editor to close after Escape", async () => {
      const frame = await findCurrentFrame(page);
      return frame !== undefined && await frame.locator("[data-sphinx-preview-table-cell-editor]").count() === 0;
    });
    assert.equal(bufferText(source), LABEL_ABOVE_TABLE_DOCUMENT, "the buffer is unchanged");
  });
}
