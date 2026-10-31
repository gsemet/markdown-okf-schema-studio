import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import { type Page } from "playwright-core";

import { resolveFrontmatterLinkRoots } from "../../../src/core/frontmatter/fileLinks";
import { MarkdownStemIndex } from "../../../src/core/frontmatter/stemIndex";
import { lineDelta } from "../../shared/lineDelta";
import {
  bufferText,
  findCurrentFrame,
  MOD,
  openSidePreview,
  press,
  setEditMode,
  typeText,
  waitFor,
  waitForEditor,
  waitForRender,
  withCurrentFrame,
} from "./harness";
import { escapeBlockEditor, waitForNoBlockEditor, withDocument } from "./common";
import { selectAllInControl } from "./flushBeforeNavigate";

/*
 * The replay scenarios of QA campaign 210 whose bug is fixed, as real-input scenarios: real mouse
 * and keys on the workbench, no injected page message. Each one names its replay (the JSON file in
 * the exploratory QA skill) and checks the fixed behaviour, so it fails on the code before the fix.
 *
 * Every QA 210 replay and its real-input test, so a later campaign can skip these journeys
 * (new: in this file; extended: an assertion added to an existing scenario):
 *
 * | Replay | Real-input test |
 * | --- | --- |
 * | c0-1 | existing scenarioLinkClickEditsInEditMode (linkEditMode.ts) |
 * | c1-1 | extended scenarioLinkClickEditsInEditMode (linkEditMode.ts) |
 * | c1-2 | new scenarioCardHeaderEnterCommits |
 * | c2-1 | existing scenarioHiddenReviewMarks (blockKeys.ts) |
 * | c3-1 | new scenarioAlertLazyContinuation |
 * | c4-1 | new scenarioReplaceAllNextToLinkTarget |
 * | c5-1 | none here: the wide-table Tab fix ships its own real-input scenario |
 * | c6-1 | existing scenarioRefusedValueKeepsEditorUsable, first part (frontmatterFields.ts) |
 * | c6-2 | new scenarioLinkHintMatchesTable |
 * | c6-3 | new scenarioSchemalessNumberCommits |
 * | c7-1 | new scenarioToolbarExpandKeepsFirstLinesClear (rows shown by a click; v88 covers them shown at load) |
 * | ux-03 | existing scenarioUndoStaysInEditor, "open-with" (textEditing.ts) |
 * | ux-12 | existing scenarioTableMinimalDiff (blockKeys.ts) |
 * | ux-16 | new scenarioFieldBlurMinimalDiff |
 * | ux-17 | extended scenarioEnterCommitsTextField (textEditing.ts) |
 * | ux-25 | existing scenarioPreviewKeepsMarkdown (editorWidgets.ts) |
 * | ux-35 | new scenarioCrlfAlertEditKeepsLineEndings |
 * | ux-38 | existing scenarioRefusedValueKeepsEditorUsable, second part (frontmatterFields.ts) |
 */

const BLOCK_EDITOR = "[data-sphinx-preview-block-editor] textarea";

/** The number of open raw-Markdown editors in the current webview. */
async function blockEditorCount(page: Page): Promise<number> {
  return withCurrentFrame(page, (frame) => frame.locator("[data-sphinx-preview-block-editor]").count());
}

/** Closes the block editor a commit click may have opened, if there is one. */
async function closeOpenBlockEditor(page: Page, description: string): Promise<void> {
  if (await blockEditorCount(page) > 0) await escapeBlockEditor(page, description);
}

const CARD_HEADER = ":header: Since v2.1.154, published 2026-05-28";

const CARD_DOCUMENT = [
  "# Cards",
  "",
  ":::{card} Claude Code",
  CARD_HEADER,
  ":footer: Documented in the workflows guide",
  "",
  "- Saved in `.claude/workflows/`, run as `/<name>`.",
  ":::",
  "",
  "Tail paragraph.",
  "",
].join("\n");

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-258
/**
 * QA 210 c1-2: Enter in the editor of a card's `:header:` option saves the line and closes the
 * editor. It never adds a line: a blank line after the option would end the card's options.
 */
export async function scenarioCardHeaderEnterCommits(page: Page): Promise<void> {
  await withDocument("realinput-qa210-c1-2", CARD_DOCUMENT, async (document) => {
    await openSidePreview(document);
    await waitForRender(document);
    await setEditMode(page, true);
    await withCurrentFrame(page, (frame) =>
      frame.locator(".myst-grid-card-header", { hasText: "Since v2.1.154" }).click());
    await waitForEditor(page, BLOCK_EDITOR);
    await press(page, "End");
    await typeText(page, " Q");
    await press(page, "Enter");
    // Autosave may already hold " Q": the closed editor is what shows Enter saved the line.
    await waitForNoBlockEditor(page, "Enter in the :header: editor to save and close it");
    const expected = CARD_DOCUMENT.replace(CARD_HEADER, `${CARD_HEADER} Q`);
    await waitFor("the saved :header: line in the buffer", () => bufferText(document) === expected);
    assert.deepEqual(lineDelta(CARD_DOCUMENT, bufferText(document)), {
      removed: [CARD_HEADER],
      added: [`${CARD_HEADER} Q`],
    }, "Enter changed the :header: line only, with no blank line before :footer:");
  });
}

const LAZY_LINE = "lazy continuation line of the note.";

const ALERT_DOCUMENT = [
  "# Alerts",
  "",
  "Intro paragraph.",
  "",
  "> [!NOTE]",
  "> Line one of a note.",
  LAZY_LINE,
  "",
  "Tail paragraph.",
  "",
].join("\n");

// @tests_req SwRS-MDOKFSTUDIO-GFM-009
/**
 * QA 210 c3-1: an unquoted line that continues the paragraph of a GitHub alert (CommonMark lazy
 * continuation) renders inside the alert, and a click in the alert opens an editor that holds it.
 */
export async function scenarioAlertLazyContinuation(page: Page): Promise<void> {
  await withDocument("realinput-qa210-c3-1", ALERT_DOCUMENT, async (document) => {
    await openSidePreview(document);
    await waitForRender(document);
    const alert = "aside[data-okf-github-alert]";
    await waitFor("the rendered alert", async () =>
      await withCurrentFrame(page, (frame) => frame.locator(alert).count()) === 1);
    await withCurrentFrame(page, async (frame) => {
      assert.ok((await frame.locator(alert).innerText()).includes(LAZY_LINE), "the lazy line renders inside the alert");
      assert.equal(await frame.locator("p", { hasText: LAZY_LINE }).count(),
        await frame.locator(`${alert} p`, { hasText: LAZY_LINE }).count(),
        "no paragraph outside the alert holds the lazy line");
    });
    await setEditMode(page, true);
    await withCurrentFrame(page, (frame) => frame.locator(`${alert} p`, { hasText: "Line one" }).click());
    await waitForEditor(page, BLOCK_EDITOR);
    const text = await withCurrentFrame(page, (frame) => frame.locator(BLOCK_EDITOR).inputValue());
    assert.ok(text.includes("> [!NOTE]") && text.includes(LAZY_LINE),
      `the alert editor holds the head and the lazy line: ${JSON.stringify(text)}`);
    await escapeBlockEditor(page, "the alert editor to close");
    assert.equal(bufferText(document), ALERT_DOCUMENT, "opening and closing the editor changes nothing");
  });
}

const FIND_DOCUMENT = [
  "# Heading",
  "",
  "Para needle one.",
  "",
  "- list needle",
  "- [link needle](https://example.com/needle)",
  "",
  "Tail needle.",
  "",
].join("\n");

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-012
// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-131
/**
 * QA 210 c4-1: Replace all from the preview find bar replaces the visible matches of a list whose
 * link target repeats the query. The target, which the reader cannot see, is kept.
 */
export async function scenarioReplaceAllNextToLinkTarget(page: Page): Promise<void> {
  await withDocument("realinput-qa210-c4-1", FIND_DOCUMENT, async (document) => {
    await openSidePreview(document);
    await waitForRender(document);
    // Reading mode: a click on the heading gives the frame the focus and opens no editor.
    await setEditMode(page, false);
    await withCurrentFrame(page, (frame) => frame.locator("h1", { hasText: "Heading" }).click());
    await waitFor("the preview frame to hold the focus", async () =>
      await withCurrentFrame(page, (frame) => frame.evaluate(() => window.document.hasFocus())));
    await press(page, `${MOD}+F`);
    await waitFor("the find field to hold the focus", async () =>
      await withCurrentFrame(page, (frame) => frame.evaluate(() =>
        window.document.activeElement?.hasAttribute("data-find-input") === true)));
    await typeText(page, "needle");
    // Paragraph, list item, link label and tail: the link target is not text the reader sees.
    await waitFor("the four visible matches", async () => {
      const current = await findCurrentFrame(page);
      return current !== undefined && await current.locator("[data-find-count]").textContent() === "1 of 4";
    });
    await withCurrentFrame(page, (frame) => frame.locator("[data-find-toggle-replace]").click());
    await withCurrentFrame(page, (frame) => frame.locator("[data-find-replace-input]").click());
    await typeText(page, "PIN");
    await withCurrentFrame(page, (frame) => frame.locator("[data-find-replace-all]").click());
    const expected = FIND_DOCUMENT
      .replace("Para needle", "Para PIN")
      .replace("list needle", "list PIN")
      .replace("[link needle]", "[link PIN]")
      .replace("Tail needle", "Tail PIN");
    await waitFor("Replace all to replace the four visible matches, the list included", () =>
      bufferText(document) === expected);
    assert.match(bufferText(document), /\(https:\/\/example\.com\/needle\)/u, "the link target is kept");
    await press(page, "Escape");
  });
}

/**
 * The link target of c6-2: `zz-` sorts it after the tracked Markdown stems of the repository, the
 * fixed token names this test, and the run token (process and start time) keeps a file left by an
 * earlier interrupted run, or any other file of the workspace, from holding the same stem.
 */
const LINK_HINT_TARGET = `zz-qa210-c6-2-link-hint-target-${process.pid.toString(36)}-${Date.now().toString(36)}`;

const LINK_HINT_DOCUMENT = [
  "---",
  "type: req",
  "title: Link hint",
  "related:",
  `- ${LINK_HINT_TARGET}`,
  "---",
  "",
  "# Link hint",
  "",
  "Body text.",
  "",
].join("\n");

const LINK_HINT_SCHEMA = [
  "type: object",
  "properties:",
  "  type:",
  "    type: string",
  "  title:",
  "    type: string",
  "  related:",
  "    type: array",
  "    items:",
  "      type: string",
  "      x-okf-link: { resolution: filename-stem, syntax: plain }",
  "",
].join("\n");

/** The dropdown cap the fix a123bf4e works around: the old warning set was the first 500 sorted stems. */
const LINK_DROPDOWN_CAP = 500;

/** The repository root, a folder of the integration workspace (run-tests.ts), holding the fixtures. */
const REPOSITORY_ROOT = path.resolve(__dirname, "../../../..");

/** A folder's real path, as the stem index compares roots (the folder itself when it is missing). */
function realFolder(folder: string): string {
  try {
    return fs.realpathSync(folder);
  } catch {
    return path.resolve(folder);
  }
}

/**
 * The precondition of c6-2: at least 500 stems of the index the extension builds for `filePath`
 * come before the target, so the old alphabetical cut leaves it out. It counts the repository
 * only, never the other workspace folder (`/tmp` on CI), so the commit decides the outcome, not
 * the machine: the extension's index walks a superset of these roots, sorts by code unit (a total
 * order) and keeps each stem once, so another folder can only add stems before the target, never
 * remove one; and no other file can hold the target's stem (see LINK_HINT_TARGET).
 */
function assertTargetBeyondDropdownCap(filePath: string, target: string): void {
  const repository = realFolder(REPOSITORY_ROOT);
  const roots = resolveFrontmatterLinkRoots({
    filePath,
    workspaceRoots: (vscode.workspace.workspaceFolders ?? []).map((folder) => folder.uri.fsPath),
    schemaDirectory: path.join(path.dirname(filePath), "_schema"),
  }).filenameRoots.map(realFolder);
  assert.ok(roots.includes(repository),
    `precondition: the link roots ${JSON.stringify(roots)} do not hold the repository ${repository}`);
  const index = new MarkdownStemIndex([repository]);
  assert.equal(index.get(target).length, 1, `precondition: one file of the repository is named ${target}.md`);
  const position = index.stems().indexOf(target);
  assert.ok(position >= LINK_DROPDOWN_CAP,
    `precondition: fewer than ${LINK_DROPDOWN_CAP} Markdown stems of the repository sort before the target `
    + `(${position}); the test no longer proves the fix`);
}

// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-010
/**
 * QA 210 c6-2: the list editor of a filename-stem link field does not warn "No Markdown file
 * named ..." for a value the properties table resolves, in a workspace with more stems than its
 * dropdown lists. An unknown value still gets the warning.
 */
export async function scenarioLinkHintMatchesTable(page: Page): Promise<void> {
  await withDocument("realinput-qa210-c6-2", LINK_HINT_DOCUMENT, async (document) => {
    fs.writeFileSync(path.join(path.dirname(document.uri.fsPath), `${LINK_HINT_TARGET}.md`), "# Link hint target\n");
    assertTargetBeyondDropdownCap(document.uri.fsPath, LINK_HINT_TARGET);
    await openSidePreview(document);
    await waitForRender(document);
    await setEditMode(page, true);
    const link = `tr[data-okf-field="related"] a[data-sphinx-preview-navigation^="okf-link:"]`;
    await waitFor("the table to resolve the related target", async () => {
      const current = await findCurrentFrame(page);
      return current !== undefined && await current.locator(link).count() === 1;
    });
    await withCurrentFrame(page, (frame) => frame.locator(link).click());
    await waitForEditor(page, "[data-okf-frontmatter-editor] .okf-list-editor");
    await withCurrentFrame(page, (frame) => frame.locator("[data-okf-list-item-input]").first().click());
    const warning = '[data-okf-frontmatter-editor] [role="status"][data-state="warning"][data-visible="true"]';
    const warnings = (): Promise<number> => withCurrentFrame(page, (frame) => frame.locator(warning).count());
    await press(page, "End");
    await typeText(page, "X");
    await waitFor("the warning for an unknown target", async () => await warnings() === 1);
    await press(page, "Backspace");
    await waitFor("no warning once the value is the target the table resolves", async () => await warnings() === 0);
    await press(page, "Escape");
    await waitFor("the list editor to close", async () =>
      await withCurrentFrame(page, (frame) => frame.locator("[data-okf-frontmatter-editor]").count()) === 0);
    assert.equal(bufferText(document), LINK_HINT_DOCUMENT, "the value is unchanged");
  }, LINK_HINT_SCHEMA);
}

const VAULT_DOCUMENT = [
  "---",
  "aliases:",
  "  - Brake note",
  "tags:",
  "  - draft",
  "rating: 4.5",
  "---",
  "",
  "# Vault-style note",
  "",
  "Body paragraph.",
  "",
].join("\n");

// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-003
/**
 * QA 210 c6-3: in a file without a schema, a number typed in the YAML box of a number field is
 * saved by Cmd/Ctrl+Enter, and the editor closes.
 */
export async function scenarioSchemalessNumberCommits(page: Page): Promise<void> {
  await withDocument("realinput-qa210-c6-3", VAULT_DOCUMENT, async (document) => {
    await openSidePreview(document);
    await waitForRender(document);
    await setEditMode(page, true);
    await withCurrentFrame(page, (frame) =>
      frame.locator('tr[data-okf-field="rating"] [data-okf-edit-cell="value"]').click());
    const box = "[data-okf-frontmatter-editor] textarea";
    await waitForEditor(page, box);
    await selectAllInControl(page, box, "QA 210 c6-3 rating");
    await typeText(page, "3.5");
    await press(page, `${MOD}+Enter`);
    await waitFor("the number to reach the buffer", () => /^rating: 3\.5$/mu.test(bufferText(document)));
    assert.deepEqual(lineDelta(VAULT_DOCUMENT, bufferText(document)), {
      removed: ["rating: 4.5"],
      added: ["rating: 3.5"],
    });
    await waitFor("the rating editor to close", async () =>
      await withCurrentFrame(page, (frame) => frame.locator("[data-okf-frontmatter-editor]").count()) === 0);
  });
}

const EDGE_TITLE = "title: Brake release detection # trailing comment";

const EDGE_DOCUMENT = [
  "---",
  "# Leading comment that must survive edits",
  "type: req",
  EDGE_TITLE,
  "summary: >-",
  "  A folded summary that spans two source lines",
  "  and must stay folded after unrelated edits.",
  "notes: |",
  "  Line one of a literal block.",
  "  Line two keeps its break.",
  "priority: 3",
  'tags: [braking, safety, "with: colon"]',
  "owner:",
  "  name: Ada",
  "  team: Chassis",
  "---",
  "",
  "# Frontmatter edge cases",
  "",
  "Body paragraph that must stay untouched.",
  "",
].join("\n");

const EDGE_SCHEMA = [
  "type: object",
  "properties:",
  "  type:",
  "    type: string",
  "  title:",
  "    type: string",
  "additionalProperties: true",
  "",
].join("\n");

// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-043
/**
 * QA 210 ux-16 (campaign 001 guard): a title typed in its field editor and saved by a click
 * elsewhere changes the title line only; comments, folded and literal blocks and flow sequences
 * around it are untouched.
 */
export async function scenarioFieldBlurMinimalDiff(page: Page): Promise<void> {
  await withDocument("realinput-qa210-ux-16", EDGE_DOCUMENT, async (document) => {
    await openSidePreview(document);
    await waitForRender(document);
    await setEditMode(page, true);
    await withCurrentFrame(page, (frame) =>
      frame.locator('tr[data-okf-field="title"] [data-okf-edit-cell="value"]').click());
    const box = "[data-okf-frontmatter-editor] textarea";
    await waitForEditor(page, box);
    await selectAllInControl(page, box, "QA 210 ux-16 title");
    await typeText(page, "Brake release X");
    await withCurrentFrame(page, (frame) => frame.locator("h1", { hasText: "Frontmatter edge cases" }).click());
    await waitFor("the title to reach the buffer", () => /^title: .*Brake release X/mu.test(bufferText(document)));
    const delta = lineDelta(EDGE_DOCUMENT, bufferText(document));
    assert.deepEqual(delta.removed, [EDGE_TITLE], "only the title line is replaced");
    assert.equal(delta.added.length, 1, `the new title is one line: ${JSON.stringify(delta.added)}`);
    await closeOpenBlockEditor(page, "the heading editor the click opened to close");
  }, EDGE_SCHEMA);
}

const CRLF_DOCUMENT = [
  "---",
  "title: CRLF document",
  "---",
  "",
  "# CRLF document",
  "",
  "> [!NOTE]",
  "> A GitHub alert in a CRLF document.",
  "",
  "Last paragraph.",
  "",
].join("\r\n");

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-234
/**
 * QA 210 ux-35 (campaign 001 guard): in a CRLF document, two lines typed in an alert editor and
 * saved by a click elsewhere reach the buffer with CRLF line endings, and no stale status shows.
 */
export async function scenarioCrlfAlertEditKeepsLineEndings(page: Page): Promise<void> {
  await withDocument("realinput-qa210-ux-35", CRLF_DOCUMENT, async (document) => {
    await openSidePreview(document);
    await waitForRender(document);
    await setEditMode(page, true);
    await withCurrentFrame(page, (frame) =>
      frame.locator("aside[data-okf-github-alert] p", { hasText: "A GitHub alert in a CRLF document" }).click());
    await waitForEditor(page, BLOCK_EDITOR);
    await press(page, "End");
    await typeText(page, " Edited.");
    await press(page, "Enter");
    await typeText(page, "New line inside.");
    await waitFor("the autosave to bring both typed lines to the buffer", () =>
      /Edited\.\r\n(?:> ?)?New line inside\./u.test(bufferText(document)));
    assert.equal(await blockEditorCount(page), 1, "the alert editor is still open after the autosave");
    await withCurrentFrame(page, async (frame) => {
      assert.doesNotMatch(await frame.locator("body").innerText(), /stale/iu, "no stale status after the autosave");
    });
    await withCurrentFrame(page, (frame) => frame.locator("p", { hasText: "Last paragraph." }).click());
    await waitFor("the committed alert to render both typed lines", async () =>
      await withCurrentFrame(page, (frame) =>
        frame.locator("aside[data-okf-github-alert]", { hasText: "New line inside." }).count()) === 1);
    const text = bufferText(document);
    assert.match(text, /Edited\.\r\n(?:> ?)?New line inside\./u, "both typed lines are in the buffer");
    assert.equal(/(?<!\r)\n/u.test(text), false, `every line ends with CRLF: ${JSON.stringify(text)}`);
    await closeOpenBlockEditor(page, "the paragraph editor the click opened to close");
  });
}

const TOOLBAR_DOCUMENT = [
  "# Research, plan, implement",
  "",
  "In the previous chapters we setup an harness around your project to help coding agents be more",
  "effective in discovering and using your codebase.",
  "",
  ":::{note}",
  "Remember the role of the harness is to ground the LLM in your project reality.",
  ":::",
  "",
].join("\n");

/**
 * The text line boxes of the first `selector` element that intersect the toolbar, as
 * "left,top,right,bottom" (the heading's anchor icon left of the column's content box excluded),
 * and whether the element starts above the toolbar's bottom edge, beside it.
 */
async function linesUnderToolbar(page: Page, selector: string): Promise<{ hits: string[]; besideToolbar: boolean }> {
  return withCurrentFrame(page, (frame) => frame.evaluate((query) => {
    const bar = document.querySelector("[data-sphinx-preview-toolbar]")!.getBoundingClientRect();
    const main = document.getElementById("sphinx-myst-preview-content")!;
    const left = main.getBoundingClientRect().left + parseFloat(getComputedStyle(main).paddingLeft);
    const element = document.querySelector(query)!;
    const range = document.createRange();
    range.selectNodeContents(element);
    const hits = [...range.getClientRects()]
      .filter((r) => r.width > 0 && r.height > 0 && r.right > left + 1)
      .filter((r) => r.left < bar.right && r.right > bar.left && r.top < bar.bottom && r.bottom > bar.top)
      .map((r) => [r.left, r.top, r.right, r.bottom].map(Math.round).join(","));
    return { hits, besideToolbar: element.getBoundingClientRect().top < bar.bottom };
  }, selector));
}

/** The toolbar state of the current preview: "expanded" or "collapsed". */
async function toolbarState(page: Page): Promise<string | null> {
  return withCurrentFrame(page, (frame) => frame.locator("html").getAttribute("data-sphinx-preview-toolbar-state"));
}

/** Clicks the toolbar's collapse button and waits for the state it toggles to. */
async function clickToolbarCollapse(page: Page, wanted: "expanded" | "collapsed"): Promise<void> {
  await withCurrentFrame(page, (frame) => frame.locator("[data-sphinx-preview-toolbar-collapse]").click());
  await waitFor(`the view controls to be ${wanted}`, async () => await toolbarState(page) === wanted);
}

// @tests_req SwRS-MDOKFSTUDIO-LAYOUT-043
/**
 * QA 210 c7-1: in a side preview about 430 px wide, a click on Show view controls unrolls the
 * toolbar's rows over the top of the document, and the first heading and paragraph wrap around
 * it: no line of their text runs under the toolbar. The visual scenario v88 checks the page
 * loaded with the rows already shown; this one checks the rows shown by a click after the render.
 */
export async function scenarioToolbarExpandKeepsFirstLinesClear(page: Page): Promise<void> {
  await page.setViewportSize({ width: 900, height: 900 });
  try {
    await withDocument("realinput-qa210-c7-1", TOOLBAR_DOCUMENT, async (document) => {
      await openSidePreview(document);
      await waitForRender(document);
      const width = await withCurrentFrame(page, (frame) => frame.evaluate(() => window.innerWidth));
      assert.ok(width <= 460, `the side preview is narrow, as in the replay (${width} px)`);
      const initial = await toolbarState(page);
      try {
        if (initial === "expanded") await clickToolbarCollapse(page, "collapsed");
        await clickToolbarCollapse(page, "expanded");
        await waitFor("the unrolled rows to reach their full height", async () =>
          await withCurrentFrame(page, (frame) => frame.evaluate(() =>
            !window.document.querySelector("[data-sphinx-preview-toolbar-more]")!.hasAttribute("data-sphinx-preview-toolbar-animating")
            && window.document.querySelector("[data-sphinx-preview-toolbar]")!.getBoundingClientRect().height > 120)));
        assert.equal(await withCurrentFrame(page, (frame) => frame.evaluate(() => window.scrollY)), 0, "the page is at its top");
        const main = "#sphinx-myst-preview-content";
        await waitFor("the first heading and paragraph to wrap around the unrolled toolbar", async () =>
          (await linesUnderToolbar(page, `${main} > h1`)).hits.length === 0
          && (await linesUnderToolbar(page, `${main} > p`)).hits.length === 0);
        assert.ok((await linesUnderToolbar(page, `${main} > p`)).besideToolbar,
          "the first paragraph starts beside the toolbar, where it could be covered");
      } finally {
        // The toolbar state is stored for the workspace: put it back for the next scenarios.
        if (initial !== null && await toolbarState(page) !== initial) await clickToolbarCollapse(page, initial as "expanded" | "collapsed");
      }
    });
  } finally {
    await page.setViewportSize({ width: 1400, height: 900 });
  }
}

/** The QA 210 replays in run order: the integration sequence and `STUDIO_REAL_INPUT_SCENARIO=qa210-replays`. */
export const QA210_REPLAYS: ReadonlyArray<(page: Page) => Promise<void>> = [
  scenarioCardHeaderEnterCommits,
  scenarioAlertLazyContinuation,
  scenarioReplaceAllNextToLinkTarget,
  scenarioLinkHintMatchesTable,
  scenarioSchemalessNumberCommits,
  scenarioFieldBlurMinimalDiff,
  scenarioCrlfAlertEditKeepsLineEndings,
  scenarioToolbarExpandKeepsFirstLinesClear,
];
