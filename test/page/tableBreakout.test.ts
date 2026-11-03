/**
 * Requirement test of the Auto width table rule (variant D) in a real browser: a table stays in
 * the column when its minimum widths fit (a token column never wraps and keeps its widest cell, a
 * prose column keeps about 20 characters) and breaks out to its natural width otherwise. The twelve
 * cases are the ones the owner reviewed; the page is the real preview (render pipeline, stylesheet,
 * page runtime), the column is 688 px wide (720 px minus the two 16 px gutters of the review).
 * Skipped, with a message, when no Chromium can start here.
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
import { pageRuntimeScript } from "./runtimeHarness";

/** Both themes; STUDIO_TABLE_THEME picks one (the review pictures of a failing run). */
const RUN_THEMES = process.env.STUDIO_TABLE_THEME ? [process.env.STUDIO_TABLE_THEME] : ["light", "dark"];
const COLUMN = 688;
const GUTTER = 78;
const PANE = 1100;

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
  { title: "two columns: long code paths", stays: false, markdown: table(["File", "Role"], [
    [code("src/page/features/blockEditing/editorPlacement.ts"), "Places the block editor and its palette."],
    [code("test/integration/realInput/scenarios/gridCardEditorBlur.ts"), "Real-window scenario for the blur bug."],
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
  { title: "six columns: mixed, medium text", stays: false, markdown: table(["Requirement", "Tier", "Status", "Owner", "Test", "Rationale"], [
    ["BLOCK-047", "SwRS", "approved", "Studio", code("blockBlur.test.ts"), "Window blur commits and closes the editor; no data loss."],
    ["TOOLBAR-009", "SwRS", "proposed", "Studio", code("findShortcut.test.ts"), "Cmd/Ctrl+F opens the find bar from any editing field."],
  ]) },
  { title: "three columns: inline code identifiers", stays: false, markdown: table(["Setting", "Default", "Effect"], [
    [code("markdownOkfSchemaStudio.preview.showIncomingChanges"), code("true"), "Marks blocks changed since the last commit with a green bar."],
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

async function openPage(markdown: string, themeId: string): Promise<Opened | undefined> {
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
    rendered.html, workspace, bundle, context, workspace, undefined, COLUMN + GUTTER * 2, true, true, [], "builtin",
  );
  assert.ok(serializeRuntimeContext(context).length > 0);
  const pagePath = path.join(root, "page.html");
  fs.writeFileSync(pagePath, built.html);

  let browser: Browser;
  try {
    browser = await chromium.launch();
  } catch {
    return undefined;
  }
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
  await page.waitForFunction(() => document.documentElement.getAttribute("data-sphinx-preview-width") === "auto");
  return { browser, page, close: async () => { await browser.close(); } };
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
      t.skip("no Chromium can start here (run `just dev` to install it)");
      return;
    }
    try {
      const measured = await measureTables(opened.page);
      await shootCases(opened.page, themeId, "table-case");
      assert.equal(measured.length, CASES.length, "every case renders one top-level table");
      CASES.forEach((entry, index) => {
        const { wide, width, column } = measured[index]!;
        assert.equal(column, COLUMN, "the column is 688 px wide");
        assert.equal(wide, !entry.stays,
          `${themeId} case ${index + 1} (${entry.title}) ${entry.stays ? "stays in the column" : "breaks out"}: wide ${wide}, width ${width}`);
        if (entry.stays) assert.ok(width <= column + 1, `${themeId} case ${index + 1} fits the column: ${width} px`);
        else assert.ok(width > column + 1 && measured[index]!.pageOverflow <= 0,
          `${themeId} case ${index + 1} takes more than the column without scrolling the page: ${width} px`);
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
      t.skip("no Chromium can start here (run `just dev` to install it)");
      return;
    }
    try {
      const measured = await measureTables(opened.page);
      await shootCases(opened.page, themeId, "table-unshrinkable");
      assert.equal(measured.length, UNSHRINKABLE.length, "every case renders one top-level table");
      UNSHRINKABLE.forEach((entry, index) => {
        assert.equal(measured[index]!.wide, true, `${entry.title} breaks the table out (width ${measured[index]!.width} px)`);
      });
    } finally {
      await opened.close();
    }
  }
});
