/**
 * Requirement test of the Auto width table rule (variant D) in a real browser: a table stays in
 * the column when its minimum widths fit (a token column never wraps and keeps its widest cell, a
 * prose column keeps about 20 characters) and breaks out to its natural width otherwise. The twelve
 * cases are the ones the owner reviewed; the page is the real preview (render pipeline, stylesheet,
 * page runtime), the column is 688 px wide (720 px minus the two 16 px gutters of the review).
 * The page draws its text in the pinned KaTeX fonts (`pinnedFont.ts`), not in the machine's own
 * fonts, so the widths and the verdicts are the same on every machine; a face that does not load
 * fails the test (the browser is closed). Skipped, with a message, when no Chromium can start here,
 * unless STUDIO_REQUIRE_CHROMIUM=1: the `visual` CI job runs these tests on Linux with it, and a
 * Chromium that cannot start then fails them with the launch error. The measured widths are printed
 * with `t.diagnostic`, so every run of that job logs them.
 *
 * Windows is the reference: there the verdicts and the widths are asserted. Off Windows (the Linux
 * CI job) the same checks are report-only: they print every difference from the Windows reference
 * with `t.diagnostic` and never fail (CI run 44719229037 measured other widths on Linux, and the
 * owner decided, order O-80, to report them rather than assert them). A Chromium that cannot start
 * still fails with STUDIO_REQUIRE_CHROMIUM=1 on every platform.
 */
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

import { chromium, type Browser, type Page } from "playwright-core";

import { serializeRuntimeContext } from "../../src/core/protocol/bootContext";
import { renderPreviewDocument } from "../../src/core/render/renderPipeline";
import { buildPreviewWebviewHtml } from "../../src/session/webview";
import { fakeAssetResolver } from "../shared/fakeAssets";
import { THEMES } from "../visual/themes";
import { PINNED_MONO_FAMILY, PINNED_SANS_FAMILY, pinTestFonts } from "./pinnedFont";
import { pageRuntimeScript } from "./runtimeHarness";

/** Both themes; STUDIO_TABLE_THEME picks one (the review pictures of a failing run). */
const RUN_THEMES = process.env.STUDIO_TABLE_THEME ? [process.env.STUDIO_TABLE_THEME] : ["light", "dark"];
const COLUMN = 688;
const GUTTER = 78;
const PANE = 1100;

/**
 * Windows is the reference of the widths and the verdicts: they are asserted there and only reported
 * elsewhere. STUDIO_BREAKOUT_REPORT_ONLY=1 forces the report-only mode (to try it on Windows).
 */
const ASSERT_WIDTHS = process.platform === "win32" && process.env.STUDIO_BREAKOUT_REPORT_ONLY !== "1";

/** Windows widths and verdicts (`<width>W` breaks out, `<width>s` stays), as the owner reviewed them. */
const WINDOWS_CASES = "688s 688s 688s 688s 1068W 735W 748W 338s 537s 719W 894W 824W";
const WINDOWS_UNSHRINKABLE = "1068W 972W 1068W";
const WINDOWS_TICK_MATRIX = { open: 719, narrower: 568 };

interface Reporter {
  diagnostic(message: string): void;
}

/** Runs width and verdict checks: asserted on the reference platform, only reported (never failed) elsewhere. */
function verify(t: Reporter, label: string, checks: () => void): void {
  if (ASSERT_WIDTHS) {
    checks();
    return;
  }
  try {
    checks();
  } catch (error) {
    t.diagnostic(`differs from the Windows reference (report only, ${label}): ${(error as Error).message}`);
  }
}

/** Names each measured entry that differs from the Windows reference list. */
function reportDifferences(t: Reporter, label: string, measured: string[], reference: string): void {
  const expected = reference.split(" ");
  const different = measured.flatMap((entry, index) => (entry === expected[index]
    ? [] : [`#${index + 1} ${entry} (Windows ${expected[index]})`]));
  t.diagnostic(different.length === 0
    ? `${label}: same as the Windows reference`
    : `${label}: differs from the Windows reference${ASSERT_WIDTHS ? "" : " (report only)"}: ${different.join(", ")}`);
}

/** A precondition of a cell-edit test (the table breaks out, or fits): asserted on the reference platform; elsewhere false and reported when it does not hold. */
function precondition(t: Reporter, holds: boolean, message: string): boolean {
  if (ASSERT_WIDTHS) {
    assert.ok(holds, message);
    return true;
  }
  if (!holds) t.diagnostic(`precondition not met, rest of the test skipped (report only): ${message}`);
  return holds;
}

const code = (text: string): string => `\`${text}\``;
const row = (...cells: string[]): string => `| ${cells.join(" | ")} |`;
const lorem = (count: number): string => ("Drive one change request from change spec to merge request inside a dedicated git worktree, "
  + "plan the work, implement it with fixed-model agents and record every decision").split(" ").slice(0, count).join(" ");
const table = (heads: string[], rows: string[][], right: number[] = []): string[] => [
  row(...heads),
  `| ${heads.map((_, index) => (right.includes(index) ? "---:" : "---")).join(" | ")} |`,
  ...rows.map((cells) => row(...cells)),
  "",
];

/** The twelve cases of the owner's review, in order, with the verdict at a 720 px column. */
const CASES: Array<{ title: string; stays: boolean; markdown: string[] }> = [
  { title: "two columns: short name, long prose", stays: true, markdown: table(["name", "description"], [
    [code("autocycle-driver"), "Drive one FullCycle change request from change spec to draft merge request without a human in the loop, inside a dedicated git worktree. Started by the AutoCycle Chief of Staff; plans, implements with fixed-model Coder and Inspector agents, finalizes and records autonomous decisions. Not meant to be invoked directly by users."],
    [code("chief-of-staff"), "Start a Chief of Staff that runs FullCycle change requests end to end. It interviews the user to a change spec, then hands each spec to an autonomous Driver in a dedicated git worktree that plans, implements, finalizes and opens a draft merge request."],
  ]) },
  { title: "two columns: prose in both", stays: true, markdown: table(["Option", "Consequence"], [
    ["Keep the current behaviour and document it in the user guide", "Nothing changes for existing documents; users who expected the other behaviour read the guide and adapt their writing habits over time."],
    ["Align the behaviour with GitHub and change the defaults", "Documents look the same everywhere, but some existing documents render differently after the update and need a quick review."],
  ]) },
  { title: "three columns: short, short, prose", stays: true, markdown: table(["ID", "Status", "Summary"], [
    ["CORE-001", "approved", lorem(22)], ["GFM-002", "proposed", lorem(14)], ["MYST-001", "approved", lorem(28)],
  ]) },
  { title: "four columns: one prose column, three short", stays: true, markdown: table(["Task", "Owner", "Due", "Notes"], [
    ["Migrate the export service", "Platform", "2026-11-12", lorem(20)],
    ["Cache rendered files", "Platform", "2026-11-19", lorem(12)],
    ["Stream while saving", "Storage", "2026-11-26", lorem(25)],
  ]) },
  { title: "four columns: prose in every column", stays: false, markdown: table(["Problem", "Cause", "Fix", "Risk"], [
    [lorem(10), lorem(14), lorem(12), lorem(9)], [lorem(13), lorem(8), lorem(16), lorem(11)],
  ]) },
  // Cases 6 and 12: the longest token, in the pinned monospace font, is wider than the column on
  // its own, so the table breaks out.
  { title: "two columns: long code paths", stays: false, markdown: table(["File", "Role"], [
    [code("src/page/features/blockEditing/editorPlacement.ts"), "Places the block editor and its palette."],
    [code("test/integration/realInput/scenarios/blockEditing/gridCardEditorBlur.ts"), "Real-window scenario for the blur bug."],
    [code("src/core/preview/styles/contentLayoutStyles.ts"), "Column width, breakout and gutters."],
  ]) },
  { title: "three columns with a long URL", stays: false, markdown: table(["Source", "Link", "Use"], [
    ["OKF spec", "https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md", "Front matter rules"],
    ["MyST", "https://myst-parser.readthedocs.io/en/latest/syntax/roles-and-directives.html", "Directive syntax"],
  ]) },
  { title: "five columns: short numbers", stays: true, markdown: table(["Endpoint", "Calls/day", "p50", "p95", "Gain"], [
    ["/export/pdf", "41,000", "3.4 s", "8.2 s", "89 %"], ["/export/html", "28,500", "2.2 s", "5.9 s", "88 %"], ["/export/csv", "17,800", "0.9 s", "2.6 s", "85 %"],
  ], [1, 2, 3, 4]) },
  { title: "eight columns: numbers", stays: true, markdown: table(["Endpoint", "Calls/day", "p50", "p95", "Step 1", "Step 2", "Step 3", "Gain"], [
    ["/export/pdf", "41,000", "3.4 s", "8.2 s", "4.6 s", "2.1 s", "0.9 s", "89 %"],
    ["/export/docx", "9,300", "4.8 s", "11.4 s", "6.3 s", "3.0 s", "1.3 s", "89 %"],
    ["/export/zip", "3,100", "6.7 s", "15.0 s", "9.8 s", "4.2 s", "1.8 s", "88 %"],
  ], [1, 2, 3, 4, 5, 6, 7]) },
  { title: "ten columns: tick matrix", stays: false, markdown: table(
    ["Feature", "GFM", "MyST", "OKF", "Mermaid", "PlantUML", "Vega", "Tables", "Comments", "Diff"], [
      ["Studio", "✓", "✓", "✓", "✓", "✓", "✓", "✓", "✓", "✓"],
      ["Built-in preview", "✓", "–", "–", "–", "–", "–", "✓", "–", "✓"],
      ["Obsidian", "✓", "–", "–", "✓", "–", "–", "✓", "–", "–"],
    ]) },
  // Its text was lengthened so that it also breaks out in the pinned fonts.
  { title: "six columns: mixed, medium text", stays: false, markdown: table(["Requirement", "Tier", "Status", "Owner", "Test", "Rationale"], [
    ["BLOCK-047", "SwRS", "approved", "Platform", code("blockEditorWindowBlur.test.ts"), "Window blur commits and closes the editor; no data loss."],
    ["TOOLBAR-009", "SwRS", "proposed", "Platform", code("toolbarFindShortcut.test.ts"), "Cmd/Ctrl+F opens the find bar from any editing field."],
  ]) },
  { title: "three columns: inline code identifiers", stays: false, markdown: table(["Setting", "Default", "Effect"], [
    [code("markdownOkfSchemaStudio.frontmatter.allowOutsideWorkspaceLinks"), code("false"), "Lets a frontmatter link point outside the workspace."],
    [code("markdownOkfSchemaStudio.comments.authorName"), code('""'), "Signs comments; falls back to Git user.name."],
  ]) },
];

/** Cells that cannot shrink: the table has to break out (MyST list tables, so a cell can hold a code block). */
const LONG_LINE = "x".repeat(110);
const COMMAND = "just compile && just check && just unit && just contracts && just security && just release-tests && just requirements-lint";
const listTable = (head: string[], cells: string[][]): string[] => [
  "`````{list-table}", ":header-rows: 1", "",
  ...[head, ...cells].flatMap((cellRow) => cellRow.flatMap((cell, index) => cell.split("\n").map((line, lineIndex) => (
    lineIndex === 0 ? `${index === 0 ? "*" : " "} - ${line}` : `    ${line}`)))),
  "`````", "",
];
const UNSHRINKABLE: Array<{ title: string; markdown: string[] }> = [
  { title: "a code block in a cell", markdown: listTable(["Step", "Command"], [
    ["Build the whole preview from the sources", `\`\`\`bash\n${COMMAND}\n\`\`\``],
  ]) },
  { title: "an admonition with a code block in a cell", markdown: listTable(["Name", "Description"], [
    ["Build", `Run the checks\n\n\`\`\`\`{warning}\nUnconverted content\n\n\`\`\`bash\n${COMMAND}\n\`\`\`\n\`\`\`\``],
  ]) },
  { title: "a long unbroken line in a prose cell", markdown: table(["Option", "Consequence"], [
    ["Keep the current behaviour and document it in the user guide", `Nothing changes for existing documents, see ${LONG_LINE} for the details and adapt over time.`],
    ["Align the behaviour with GitHub and change the defaults", "Documents look the same everywhere, but some existing documents render differently."],
  ]) },
];

interface Opened {
  readonly browser: Browser;
  readonly page: Page;
  close(): Promise<void>;
}

/** The error of the last Chromium launch that failed, kept for the message of a required Chromium. */
let launchError: unknown;

/** No Chromium can start: skips the test, or fails it with the launch error when STUDIO_REQUIRE_CHROMIUM=1. */
function chromiumUnavailable(t: { skip(message: string): void }): void {
  if (process.env.STUDIO_REQUIRE_CHROMIUM === "1") {
    throw new Error(`Chromium is required (STUDIO_REQUIRE_CHROMIUM=1) and cannot start: ${
      launchError instanceof Error ? launchError.message : String(launchError)}`);
  }
  t.skip("no Chromium can start here (run `just dev` to install it)");
}

/** For the regression test only: the fonts folder, and a look at the browser once it is launched. */
interface OpenOptions {
  readonly fonts?: string;
  readonly launched?: (browser: Browser) => void;
}

async function openPage(markdown: string, themeId: string, options: OpenOptions = {}): Promise<Opened | undefined> {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "table-breakout-")));
  const workspace = path.join(root, "workspace");
  fs.mkdirSync(workspace, { recursive: true });
  const documentPath = path.join(workspace, "tables.md");
  fs.writeFileSync(documentPath, markdown);
  fs.mkdirSync(path.join(root, "out", "bundle"), { recursive: true });
  fs.writeFileSync(path.join(root, "out", "bundle", "preview.js"), pageRuntimeScript());
  const rendered = await renderPreviewDocument({
    document: { uri: { scheme: "file", fsPath: documentPath }, languageId: "markdown", version: 1, getText: () => markdown },
    workspaceRoot: workspace,
    requestId: 1,
    isWorkspaceTrusted: () => true,
    plantUmlEngine: "builtin",
  });
  const assets = fakeAssetResolver({ cspSource: "file:", url: (filePath) => pathToFileURL(filePath).href, extensionRoot: root });
  const bundle = { ...assets, bundleUri: (...segments: string[]) => (segments[0] === "preview.js" ? assets.bundleUri(...segments) : undefined) };
  const context = {
    activeSourceFile: documentPath,
    documentId: pathToFileURL(documentPath).toString(),
    revision: 1,
    requestId: 1,
    previewThemeMode: "current" as const,
    initialViewPreferences: { zoom: 100, widthMode: "auto" as const, toc: false, incomingChanges: true, comments: true, toolbarCollapsed: true },
  };
  const built = buildPreviewWebviewHtml(
    rendered.html, workspace, bundle, context, workspace, undefined, COLUMN + GUTTER * 2, true, [], "builtin",
  );
  assert.ok(serializeRuntimeContext(context).length > 0);
  const pagePath = path.join(root, "page.html");
  fs.writeFileSync(pagePath, built.html);

  let browser: Browser;
  try {
    browser = await chromium.launch();
  } catch (error) {
    launchError = error;
    return undefined;
  }
  options.launched?.(browser);
  // A step that fails after the launch closes the browser, or its process keeps the test run alive.
  try {
    const page = await browser.newPage({ viewport: { width: PANE, height: 1400 }, deviceScaleFactor: 1 });
    await page.addInitScript(() => {
      (window as unknown as { acquireVsCodeApi: () => unknown }).acquireVsCodeApi = () => ({
        getState: () => ({}), setState: () => undefined, postMessage: () => undefined,
      });
    });
    await page.goto(pathToFileURL(pagePath).href);
    const theme = THEMES.find((candidate) => candidate.id === themeId)!;
    await page.evaluate((variables) => {
      for (const [name, value] of Object.entries(variables)) document.body.style.setProperty(name, value);
    }, theme.variables);
    await pinTestFonts(page, options.fonts);
    await page.waitForFunction(() => document.documentElement.getAttribute("data-sphinx-preview-width") === "auto");
    return { browser, page, close: async () => { await browser.close(); } };
  } catch (error) {
    await browser.close().catch(() => undefined);
    throw error;
  }
}

interface Measured {
  readonly wide: boolean;
  readonly width: number;
  readonly column: number;
  readonly pageOverflow: number;
}

/** Settles the layout passes, then reads each top-level table: marked wide, its width and the column. */
async function measureTables(page: Page): Promise<Measured[]> {
  await page.evaluate(async () => {
    await document.fonts.ready;
    window.dispatchEvent(new Event("resize"));
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  return page.evaluate(() => {
    const content = document.getElementById("sphinx-myst-preview-content")!;
    const style = getComputedStyle(content);
    const column = content.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    return [...content.querySelectorAll(":scope > table, :scope > figure > table")].map((element) => ({
      wide: (element.parentElement!.tagName === "FIGURE" ? element.parentElement! : element).hasAttribute("data-sphinx-preview-wide"),
      width: Math.round(element.getBoundingClientRect().width),
      column: Math.round(column),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }));
  });
}

/** With STUDIO_TABLE_SHOTS=<folder>:<state>, one picture per case (heading and table) for the review of the change. */
async function shootCases(page: Page, themeId: string, prefix: string): Promise<void> {
  const target = process.env.STUDIO_TABLE_SHOTS;
  if (!target) return;
  const [folder, state] = target.split(":");
  fs.mkdirSync(folder!, { recursive: true });
  const boxes = await page.evaluate(() => {
    const content = document.getElementById("sphinx-myst-preview-content")!;
    const headings = [...content.querySelectorAll("h2")];
    return headings.map((heading, index) => {
      const next = headings[index + 1];
      const top = heading.getBoundingClientRect().top + window.scrollY;
      const end = next ? next.getBoundingClientRect().top + window.scrollY : content.getBoundingClientRect().bottom + window.scrollY - 60;
      return { top: top - 8, height: end - top, text: heading.textContent ?? "" };
    });
  });
  for (const [index, box] of boxes.entries()) {
    const slug = box.text.replace(/^\d+\.\s*/u, "").toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");
    await page.screenshot({
      path: path.join(folder!, `${prefix}-${String(index + 1).padStart(2, "0")}-${slug}-${state}-${themeId}.png`),
      fullPage: true,
      clip: { x: 0, y: box.top, width: PANE, height: Math.min(box.height + 8, 700) },
    });
  }
}

function documentOf(items: ReadonlyArray<{ title: string; markdown: string[] }>): string {
  return items.flatMap((item, index) => [`## ${index + 1}. ${item.title}`, "", ...item.markdown]).join("\n");
}

// @tests_req SwRS-MDOKFSTUDIO-LAYOUT-044
test("Auto keeps a table in the column when its minimum widths fit and breaks it out when they do not", async (t) => {
  for (const themeId of RUN_THEMES) {
    const opened = await openPage(documentOf(CASES), themeId);
    if (!opened) {
      chromiumUnavailable(t);
      return;
    }
    try {
      const measured = await measureTables(opened.page);
      const caseWidths = measured.map((entry) => `${entry.width}${entry.wide ? "W" : "s"}`);
      t.diagnostic(`${themeId} cases ${caseWidths.join(" ")}`);
      reportDifferences(t, `${themeId} cases`, caseWidths, WINDOWS_CASES);
      await shootCases(opened.page, themeId, "table-case");
      const pin = await opened.page.evaluate((sans) => ({
        cell: getComputedStyle(document.querySelector("#sphinx-myst-preview-content td")!).fontFamily,
        code: getComputedStyle(document.querySelector("#sphinx-myst-preview-content td code")!).fontFamily,
        loaded: document.fonts.check(`14px "${sans}"`),
      }), PINNED_SANS_FAMILY);
      const first = (family: string): string => family.split(",")[0]!.trim().replace(/^["']|["']$/gu, "");
      assert.ok(first(pin.cell) === PINNED_SANS_FAMILY && first(pin.code) === PINNED_MONO_FAMILY && pin.loaded,
        `${themeId}: the page draws in the pinned fonts (cell ${pin.cell}, code ${pin.code}, loaded ${pin.loaded})`);
      assert.equal(measured.length, CASES.length, "every case renders one top-level table");
      CASES.forEach((entry, index) => {
        const { wide, width, column } = measured[index]!;
        assert.equal(column, COLUMN, "the column is 688 px wide");
        verify(t, `${themeId} case ${index + 1}`, () => {
          assert.equal(wide, !entry.stays,
            `${themeId} case ${index + 1} (${entry.title}) ${entry.stays ? "stays in the column" : "breaks out"}: wide ${wide}, width ${width}`);
          if (entry.stays) assert.ok(width <= column + 1, `${themeId} case ${index + 1} fits the column: ${width} px`);
          else assert.ok(width > column + 1 && measured[index]!.pageOverflow <= 0,
            `${themeId} case ${index + 1} takes more than the column without scrolling the page: ${width} px`);
        });
      });
      // Leaving Auto removes the rule: no token cell and no breakout stay behind in Full width.
      assert.ok(await opened.page.locator("[data-sphinx-preview-token]").count() > 0, "Auto marks the token cells");
      await opened.page.evaluate(() => document.querySelector<HTMLElement>("[data-sphinx-preview-width-toggle]")!.click());
      await opened.page.waitForFunction(() => document.documentElement.getAttribute("data-sphinx-preview-width") === "full");
      assert.equal(await opened.page.locator("[data-sphinx-preview-token], [data-sphinx-preview-wide]").count(), 0);
    } finally {
      await opened.close();
    }
  }
});

// @tests_req SwRS-MDOKFSTUDIO-LAYOUT-044
test("Auto breaks a table out when a cell holds content that cannot shrink", async (t) => {
  for (const themeId of RUN_THEMES) {
    const opened = await openPage(documentOf(UNSHRINKABLE), themeId);
    if (!opened) {
      chromiumUnavailable(t);
      return;
    }
    try {
      const measured = await measureTables(opened.page);
      const cellWidths = measured.map((entry) => `${entry.width}${entry.wide ? "W" : "s"}`);
      t.diagnostic(`${themeId} unshrinkable cells ${cellWidths.join(" ")}`);
      reportDifferences(t, `${themeId} unshrinkable cells`, cellWidths, WINDOWS_UNSHRINKABLE);
      await shootCases(opened.page, themeId, "table-unshrinkable");
      assert.equal(measured.length, UNSHRINKABLE.length, "every case renders one top-level table");
      UNSHRINKABLE.forEach((entry, index) => {
        verify(t, `${themeId} unshrinkable ${index + 1}`, () => {
          assert.equal(measured[index]!.wide, true, `${entry.title} breaks the table out (width ${measured[index]!.width} px)`);
        });
      });
    } finally {
      await opened.close();
    }
  }
});

const caseOf = (title: string) => documentOf([CASES.find((entry) => entry.title === title)!]);

interface TableState {
  readonly wide: boolean;
  readonly width: number;
}

/** Runs a layout pass and reports whether the first top-level table is marked wide, with its width. */
async function layoutPass(page: Page): Promise<TableState> {
  return page.evaluate(async () => {
    window.dispatchEvent(new Event("resize"));
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const element = document.querySelector("#sphinx-myst-preview-content > table, #sphinx-myst-preview-content > figure > table")!;
    const wrapper = element.parentElement!.tagName === "FIGURE" ? element.parentElement! : element;
    return { wide: wrapper.hasAttribute("data-sphinx-preview-wide"), width: Math.round(element.getBoundingClientRect().width) };
  });
}

/**
 * Opens the cell editor of body cell `index` as the page builds it (blockEditor.ts): edit mode on,
 * the selected cell, its rendered content hidden in a span, and the frame with the field and the
 * Done and Cancel buttons. A frame open in another cell is closed first, as a move between cells does.
 */
async function openCellEditor(page: Page, index: number): Promise<void> {
  await page.evaluate((cellIndex) => {
    document.documentElement.setAttribute("data-sphinx-preview-edit-mode", "on");
    const old = document.querySelector("[data-sphinx-preview-table-cell-editor]");
    if (old) {
      const oldCell = old.parentElement!;
      const content = oldCell.querySelector('[data-sphinx-table-cell-content="true"]')!;
      for (const node of Array.from(content.childNodes)) oldCell.insertBefore(node, content);
      content.remove();
      old.remove();
      oldCell.removeAttribute("data-sphinx-preview-table-cell-selected");
    }
    const cell = document.querySelectorAll("tbody td")[cellIndex]!;
    const content = document.createElement("span");
    content.setAttribute("data-sphinx-table-cell-content", "true");
    content.setAttribute("aria-hidden", "true");
    for (const node of Array.from(cell.childNodes)) content.appendChild(node);
    cell.appendChild(content);
    cell.setAttribute("data-sphinx-preview-table-cell-selected", "true");
    const frame = document.createElement("div");
    frame.className = "sphinx-preview-table-cell-editor";
    frame.setAttribute("data-sphinx-preview-block-editor", "true");
    frame.setAttribute("data-sphinx-preview-table-cell-editor", "true");
    const field = document.createElement("textarea");
    field.value = cell.textContent ?? "";
    frame.appendChild(field);
    const actions = document.createElement("div");
    actions.className = "sphinx-preview-block-editor-actions";
    const buttons = document.createElement("div");
    buttons.className = "sphinx-preview-block-editor-buttons";
    for (const label of ["Done", "Cancel"]) {
      const button = document.createElement("button");
      button.textContent = label;
      buttons.appendChild(button);
    }
    actions.appendChild(buttons);
    frame.appendChild(actions);
    cell.appendChild(frame);
  }, index);
}

async function withPage(
  t: { skip(message: string): void; diagnostic(message: string): void },
  markdown: string,
  body: (page: Page, themeId: string) => Promise<void>,
): Promise<void> {
  for (const themeId of RUN_THEMES) {
    const opened = await openPage(markdown, themeId);
    if (!opened) {
      chromiumUnavailable(t);
      return;
    }
    try {
      await body(opened.page, themeId);
    } finally {
      await opened.close();
    }
  }
}

// @tests_req SwRS-MDOKFSTUDIO-LAYOUT-023
test("Auto keeps the breakout of a table while a cell is edited, in every cell it moves to", async (t) => {
  // The tick matrix grows by 70 to 270 px when the 300 px minimum of the selected cell is measured.
  await withPage(t, caseOf("ten columns: tick matrix"), async (page, themeId) => {
    const before = await layoutPass(page);
    if (!precondition(t, before.wide, `${themeId}: the table breaks out before any edit (width ${before.width} px)`)) return;
    for (const index of [0, 11, 14, 23, 3, 0]) {
      await openCellEditor(page, index);
      const during = await layoutPass(page);
      assert.equal(during.wide, true, `${themeId}: cell ${index}: the table stays wide`);
      assert.ok(Math.abs(during.width - before.width) <= 1,
        `${themeId}: cell ${index}: the width stays ${before.width} px, not ${during.width} px`);
    }
  });
});

// @tests_req SwRS-MDOKFSTUDIO-LAYOUT-023
test("Auto keeps a table that fits the column in the column while a cell is edited", async (t) => {
  await withPage(t, caseOf("eight columns: numbers"), async (page, themeId) => {
    const before = await layoutPass(page);
    if (!precondition(t, !before.wide, `${themeId}: the table fits the column before any edit (width ${before.width} px)`)) return;
    for (const index of [0, 9, 17]) {
      await openCellEditor(page, index);
      const during = await layoutPass(page);
      assert.equal(during.wide, false, `${themeId}: cell ${index}: the table stays in the column (width ${during.width} px)`);
    }
  });
});

// @tests_req SwRS-MDOKFSTUDIO-LAYOUT-023
test("Auto measures a table again on a real resize while a cell is edited", async (t) => {
  await withPage(t, caseOf("ten columns: tick matrix"), async (page, themeId) => {
    await layoutPass(page);
    await openCellEditor(page, 0);
    const open = await layoutPass(page);
    if (!precondition(t, open.wide, `${themeId}: wide with the editor open (width ${open.width} px)`)) return;
    // The pane must be narrower than the table's natural width in the pinned font (`pinnedFont.ts`):
    // open 719 px on Windows, 721 px on Linux (CI run 44719229037), narrower 568 px on both;
    // 600 px is below the open width.
    await page.setViewportSize({ width: 600, height: 1400 });
    const narrower = await layoutPass(page);
    t.diagnostic(`${themeId} tick matrix open ${open.width} narrower ${narrower.width}`);
    t.diagnostic(`${themeId} tick matrix: Windows reference open ${WINDOWS_TICK_MATRIX.open} narrower ${WINDOWS_TICK_MATRIX.narrower}${
      open.width === WINDOWS_TICK_MATRIX.open && narrower.width === WINDOWS_TICK_MATRIX.narrower
        ? ", same" : ", differs (report only off Windows)"}`);
    verify(t, `${themeId} tick matrix`, () => {
      assert.ok(narrower.width < open.width, `${themeId}: the breakout follows the pane (${open.width} then ${narrower.width} px)`);
      assert.ok(narrower.width <= 600, `${themeId}: the table fits the narrower pane`);
    });
  });
});

// @tests_req SwRS-MDOKFSTUDIO-LAYOUT-023
test("Auto gives the column width to a table edited as source, or holding another editor field", async (t) => {
  await withPage(t, caseOf("two columns: long code paths"), async (page, themeId) => {
    if (!precondition(t, (await layoutPass(page)).wide, `${themeId}: the table breaks out before any edit`)) return;
    // A field that is not a cell editor: a textarea in the table, outside any cell editor frame.
    await page.evaluate(() => {
      const field = document.createElement("textarea");
      field.id = "stray-field";
      document.querySelector("td")!.appendChild(field);
    });
    assert.equal((await layoutPass(page)).wide, false, `${themeId}: another editor field keeps the column width`);
    // The table edited as source (the cell editor fell back to the raw source).
    await page.evaluate(() => {
      document.getElementById("stray-field")!.remove();
      document.querySelector("#sphinx-myst-preview-content > table, #sphinx-myst-preview-content > figure > table")!
        .setAttribute("data-sphinx-preview-editing", "true");
    });
    assert.equal((await layoutPass(page)).wide, false, `${themeId}: a table edited as source keeps the column width`);
  });
});

// @tests_req SwRS-MDOKFSTUDIO-LAYOUT-023
test("an editor opened on a paragraph does not measure the tables again; one opened on a table does", async (t) => {
  await withPage(t, "A paragraph above the table.\n\n" + caseOf("two columns: long code paths"), async (page, themeId) => {
    if (!precondition(t, (await layoutPass(page)).wide, `${themeId}: the table breaks out before any edit`)) return;
    // Each measure marks the measured tables with data-sphinx-preview-measuring, then unmarks them.
    const measuresAfterEditing = (selector: string): Promise<number> => page.evaluate(async (target) => {
      let marks = 0;
      const observer = new MutationObserver((records) => {
        marks += records.length;
      });
      observer.observe(document.getElementById("sphinx-myst-preview-content")!, {
        attributes: true, attributeFilter: ["data-sphinx-preview-measuring"], subtree: true,
      });
      document.querySelector(target)!.setAttribute("data-sphinx-preview-editing", "true");
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      observer.disconnect();
      document.querySelector(target)!.removeAttribute("data-sphinx-preview-editing");
      return marks;
    }, selector);
    assert.equal(await measuresAfterEditing("#sphinx-myst-preview-content > p"), 0,
      `${themeId}: a paragraph editor leaves the table verdicts as they are`);
    // An editor on the table itself gives it the column width at once, with no other layout trigger.
    const wideWhileEdited = await page.evaluate(async () => {
      const table = document.querySelector("#sphinx-myst-preview-content > table, #sphinx-myst-preview-content > figure")!;
      table.setAttribute("data-sphinx-preview-editing", "true");
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return table.hasAttribute("data-sphinx-preview-wide");
    });
    assert.equal(wideWhileEdited, false, `${themeId}: a table editor takes the breakout back`);
  });
});

test("A pinned font that does not load fails the test and closes the browser", async (t) => {
  const fonts = fs.mkdtempSync(path.join(os.tmpdir(), "table-breakout-bad-fonts-"));
  for (const file of ["KaTeX_SansSerif-Regular.woff2", "KaTeX_SansSerif-Bold.woff2", "KaTeX_Typewriter-Regular.woff2"]) {
    fs.writeFileSync(path.join(fonts, file), "not a font");
  }
  const kept: { browser?: Browser } = {};
  try {
    let opened: Opened | undefined;
    try {
      opened = await openPage(documentOf(CASES.slice(0, 1)), "light", { fonts, launched: (browser) => { kept.browser = browser; } });
    } catch (error) {
      assert.match((error as Error).message, /the pinned test font did not load: KaTeX_/u, "the font's error fails the test");
      assert.ok(kept.browser, "the browser was launched before the font failed");
      assert.equal(kept.browser.isConnected(), false, "openPage closed the browser when the font did not load");
      return;
    }
    if (!opened) {
      t.skip("no Chromium can start here (run `just dev` to install it)");
      return;
    }
    await opened.close();
    assert.fail("a font folder that holds no font was accepted");
  } finally {
    if (kept.browser?.isConnected()) await kept.browser.close();
    fs.rmSync(fonts, { recursive: true, force: true });
  }
});
