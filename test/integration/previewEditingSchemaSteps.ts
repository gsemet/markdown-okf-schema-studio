import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { type Frame } from "playwright-core";
import * as vscode from "vscode";
import { getActivePreviewForTests, REFRESH_COMMAND_ID } from "./extensionApi";
import { currentContext, previewFrame, replaceDocument, waitFor, waitForCurrentPreview } from "./previewEditingHelpers";
import type { EditingContext } from "./previewEditing.test";

/** The page-side key of the issue highlight recorder: see `watchIssueHighlights`. */
const ISSUE_HIGHLIGHT_WATCH = "__issueHighlightWatch";

/**
 * Starts recording, in the preview page, every cell that receives `data-okf-issue-highlight` (the page
 * sets it on the badge press, focuses the cell first and removes the attribute after 1.5 s), with the
 * row of the cell and the row holding the focus at that moment.
 */
async function watchIssueHighlights(frame: Frame): Promise<void> {
  await frame.evaluate((key) => {
    const rowOf = (element: Element | null): string | null =>
      element?.closest("tr[data-okf-field]")?.getAttribute("data-okf-field") ?? null;
    const record: { field: string | null; activeField: string | null }[] = [];
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        const cell = mutation.target as Element;
        if (mutation.oldValue === "true" || cell.getAttribute("data-okf-issue-highlight") !== "true") continue;
        record.push({ field: rowOf(cell), activeField: rowOf(document.activeElement) });
      }
    });
    observer.observe(document, {
      subtree: true, attributes: true, attributeFilter: ["data-okf-issue-highlight"], attributeOldValue: true,
    });
    (window as unknown as Record<string, unknown>)[key] = { record, observer };
  }, ISSUE_HIGHLIGHT_WATCH);
}

/**
 * Reads the recorder (mutations not yet delivered included), stops it, and adds what a failure needs:
 * the focused element and the rows marked with an issue.
 */
async function readIssueHighlights(frame: Frame): Promise<{
  record: { field: string | null; activeField: string | null }[]; active: string; errorRows: string[];
}> {
  return frame.evaluate((key) => {
    const watch = (window as unknown as Record<string, {
      record: { field: string | null; activeField: string | null }[]; observer: MutationObserver;
    }>)[key];
    if (watch === undefined) return { record: [], active: "no recorder (the page was replaced)", errorRows: [] };
    const rowOf = (element: Element | null): string | null =>
      element?.closest("tr[data-okf-field]")?.getAttribute("data-okf-field") ?? null;
    const pending = watch.observer.takeRecords().filter((mutation) =>
      mutation.oldValue !== "true" && (mutation.target as Element).getAttribute("data-okf-issue-highlight") === "true")
      .map((mutation) => ({ field: rowOf(mutation.target as Element), activeField: rowOf(document.activeElement) }));
    watch.observer.disconnect();
    const active = document.activeElement;
    return {
      record: [...watch.record, ...pending],
      active: active === null ? "none" : `${active.tagName.toLowerCase()} in row ${rowOf(active)}`,
      errorRows: [...document.querySelectorAll("tr[data-okf-field].okf-error")]
        .map((row) => row.getAttribute("data-okf-field") ?? "?"),
    };
  }, ISSUE_HIGHLIGHT_WATCH);
}

/** The table lists the schema fields in schema order; the badge counts the issues and a press focuses the first row with one. */
// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-029#S1
// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-039#S2
// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-039#S7
export async function stepSchemaOrderAndBadge(ctx: EditingContext): Promise<void> {
  const { page, document } = ctx;
  await waitForCurrentPreview(document);
  const schemaOrder = [
    "type", "id", "status", "related", "implemented_in_files", "tested_in_files", "count", "annotation_exemption",
    "exemption_reason", "tags", "metadata", "stem_target", "bundle_target", "array_targets", "non_markdown_target",
    "outside_target",
  ];
  const orderFrame = await previewFrame(page);
  const rowNames = (await orderFrame.locator("tr[data-okf-field]").evaluateAll((rows) =>
    rows.map((row) => row.getAttribute("data-okf-field") ?? ""))).filter((name) => schemaOrder.includes(name));
  assert.deepEqual(rowNames, schemaOrder.filter((name) => rowNames.includes(name)),
    "the declared fields are listed in the schema's order");
  assert.ok(rowNames.length > 10, "the schema fields are listed");

  const originalText = document.getText();
  const brokenText = originalText.replace("\ncount: 2\n", "\ncount: two\n");
  assert.notEqual(brokenText, originalText, "the fixture holds the count field the test breaks");
  // The outside edit targets the active, settled preview, as in stepSchemaProblem.
  await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
  await waitForCurrentPreview(document);
  const requestBefore = currentContext(document).requestId;
  assert.equal(await vscode.workspace.applyEdit(replaceDocument(document, brokenText)), true);
  try {
    await withPreviewEvidence(document, () => waitForCurrentPreview(document, requestBefore));
    await withPreviewEvidence(document, () => waitFor("the count field to carry its schema violation", () =>
      countRowHasError(getActivePreviewForTests()?.html ?? "") === true));
    const frame = await previewFrame(page);
    const badge = frame.locator("[data-okf-badge]");
    assert.ok(Number(await badge.getAttribute("data-okf-errors")) > 0, "the badge counts the errors");
    assert.match(await badge.getAttribute("aria-label") ?? "", /first frontmatter issue/iu);
    // The page clears the highlight 1.5 s after the press: a read after the click can come too late on a
    // slow runner. A recorder installed before the click keeps the cell the press highlighted.
    await watchIssueHighlights(frame);
    await badge.click();
    await frame.waitForFunction((key) =>
      (window as unknown as Record<string, { record: unknown[] }>)[key]!.record.length > 0,
    ISSUE_HIGHLIGHT_WATCH, { timeout: 10_000 }).catch(async (error: unknown) => {
      throw new Error(`${String(error)} page: ${JSON.stringify(await readIssueHighlights(frame))}`);
    });
    const { record } = await readIssueHighlights(frame);
    assert.equal(record.length, 1, "the badge press highlights one cell");
    assert.equal(record[0]!.field, "count", "the badge press goes to the first row with an issue");
  } finally {
    assert.equal(await vscode.workspace.applyEdit(replaceDocument(document, originalText)), true);
    await withPreviewEvidence(document, () => waitFor("the count field to be valid again", () =>
      countRowHasError(getActivePreviewForTests()?.html ?? "") === false));
    await withPreviewEvidence(document, () => waitForCurrentPreview(document));
  }
}

/** The opening tag of the `count` row of the properties table, whatever its attribute order. */
function countRowTag(html: string): string | undefined {
  return html.match(/<tr\b[^>]*\bdata-okf-field="count"[^>]*>/u)?.[0];
}

/** Whether the `count` row carries the error class; undefined when the html has no `count` row. */
function countRowHasError(html: string): boolean | undefined {
  const tag = countRowTag(html);
  return tag === undefined ? undefined : /\bclass="[^"]*\bokf-error\b/u.test(tag);
}

/** Runs a wait; on failure, rethrows it with the active preview's phase, versions and `count` row tag. */
async function withPreviewEvidence(document: vscode.TextDocument, wait: () => Promise<void>): Promise<void> {
  try {
    await wait();
  } catch (error) {
    const preview = getActivePreviewForTests();
    const evidence = preview
      ? `phase=${preview.phase} documentVersion=${String(preview.documentVersion)} document.version=${document.version}`
        + ` requestId=${String(preview.requestId)} sameDocument=${String(preview.documentUri === document.uri.toString())}`
        + ` countRow=${countRowTag(preview.html) ?? "no count row"}`
      : "no active preview";
    throw new Error(`${error instanceof Error ? error.message : String(error)} [${evidence}]`);
  }
}

/** A document of a type finds the schema of its type; a schema that cannot be parsed is reported by a warning row. */
// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-019#S4
// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-023#S5
// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-023#S7
export async function stepSchemaProblem(ctx: EditingContext): Promise<void> {
  const { document, directory } = ctx;
  await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
  await waitForCurrentPreview(document);
  const found = getActivePreviewForTests()?.html ?? "";
  assert.match(found, /data-okf-schema-found="true"/u, "the typed document finds its schema");
  assert.match(found, /data-okf-field="status"[^]*?data-okf-enums=/u, "the schema fields render with their declarations");
  // A YAML syntax error of a schema is a known unreported issue (SwRS-MDOKFSTUDIO-FMSCHEMA-023), so
  // the broken schema is a JSON5 file; .yaml outranks .json5, so the YAML schema is moved aside.
  // Renaming and adding an entry move the schema directory's time, so the refresh lists it again.
  const schemaPath = path.join(directory, "_schema", "finding.schema.yaml");
  const asidePath = `${schemaPath}.aside`;
  const json5Path = path.join(directory, "_schema", "finding.schema.json5");
  fs.renameSync(schemaPath, asidePath);
  fs.writeFileSync(json5Path, "{ type: 'object', properties: ", "utf8");
  try {
    await vscode.commands.executeCommand(REFRESH_COMMAND_ID);
    await waitFor("the schema problem to be reported", () =>
      /Schema could not be parsed/u.test(getActivePreviewForTests()?.html ?? ""), 10_000);
  } finally {
    fs.rmSync(json5Path, { force: true });
    fs.renameSync(asidePath, schemaPath);
    await vscode.commands.executeCommand(REFRESH_COMMAND_ID);
    await waitFor("the schema to be found again", () =>
      /data-okf-schema-found="true"/u.test(getActivePreviewForTests()?.html ?? "")
      && !/Schema could not be parsed/u.test(getActivePreviewForTests()?.html ?? ""), 10_000);
  }
}
