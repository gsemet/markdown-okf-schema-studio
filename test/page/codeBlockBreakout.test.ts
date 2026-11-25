/**
 * Requirement test of the Auto width rule for code blocks in a real browser: a top-level code block
 * (plain, numbered, diff, captioned) whose longest line does not fit the column widens until the
 * line fits, up to the available area, and scrolls only beyond it; a code block inside a list item
 * keeps its container's width. The page is the real preview (render pipeline, shipped stylesheet,
 * page runtime built from `src/`), the column 688 px wide in a 1100 px pane, the code in the pinned
 * KaTeX typewriter face (`pinnedFont.ts`). Every assertion is a relation measured in the page
 * against the widths the page itself reports, so it holds on every platform: no reference widths.
 * One page per cell of the code block settings (dark background, line numbers), one at a display
 * scaling of 125 % and one with the table of contents open. Skipped, with a message, when no
 * Chromium can start here, unless STUDIO_REQUIRE_CHROMIUM=1 (the `visual` CI job): a Chromium that
 * cannot start then fails the tests with the launch error. The measured widths are printed with
 * `t.diagnostic`.
 */
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test, type TestContext } from "node:test";
import { pathToFileURL } from "node:url";

import { chromium, type Browser, type Page } from "playwright-core";

import { renderPreviewDocument } from "../../src/core/render/renderPipeline";
import { createNodeFileSystem } from "../../src/node-services/nodeFileSystem";
import { buildPreviewWebviewHtml } from "../../src/session/webview";
import { fakeAssetResolver } from "../shared/fakeAssets";
import { PINNED_MONO_FAMILY, pinTestFonts } from "./pinnedFont";
import { pageRuntimeScript } from "./runtimeHarness";

const COLUMN = 688;
const GUTTER = 78;
const PANE = 1100;
const TOC_RESERVE = 256;
/** The 16 px gutter on each side of the available area. */
const AREA_GUTTERS = 32;

/** The block kinds; every one but `listed` (inside a list item) is a top-level block. */
const KINDS = ["plain", "python", "diff", "captioned", "listed"] as const;
type Kind = typeof KINDS[number] | "huge";

/** Line lengths in characters, crossing the column and the available area. */
const LENGTHS = Array.from({ length: 31 }, (_, index) => 70 + index * 3);

/** A line of exactly `length` characters, ASCII only (no glyph falls back to another font). */
function line(start: string, length: number): string {
  return `${`${start} ${"abcdefghi ".repeat(40)}`.slice(0, length - 1)}x`;
}

const label = (kind: Kind, length: number): string => `${kind}${String(length).padStart(3, "0")}`;

function documentMarkdown(): string {
  const groups = LENGTHS.flatMap((length) => [
    `## Length ${length}`, "",
    "```text", line(label("plain", length), length), "```", "",
    "```python", line(label("python", length), length), "done", "```", "",
    "```diff", `+${line(label("diff", length), length - 1)}`, "```", "",
    "```{code-block} text", `:caption: Caption ${length}`, "", line(label("captioned", length), length), "```", "",
    "1. An item of a list", "",
    "   ```text", `   ${line(label("listed", length), length)}`, "   ```", "",
  ]);
  return [...groups, "## Wider than the pane", "", "```text", line(label("huge", 300), 300), "```", ""].join("\n");
}

interface Rendered {
  readonly root: string;
  readonly workspace: string;
  readonly documentPath: string;
  readonly html: string;
}

async function renderDocument(): Promise<Rendered> {
  const markdown = documentMarkdown();
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "code-breakout-")));
  const workspace = path.join(root, "workspace");
  fs.mkdirSync(workspace, { recursive: true });
  const documentPath = path.join(workspace, "code.md");
  fs.writeFileSync(documentPath, markdown);
  fs.mkdirSync(path.join(root, "out", "bundle"), { recursive: true });
  fs.writeFileSync(path.join(root, "out", "bundle", "preview.js"), pageRuntimeScript());
  const rendered = await renderPreviewDocument({
    files: createNodeFileSystem(),
    document: { uri: { scheme: "file", fsPath: documentPath }, languageId: "markdown", version: 1, getText: () => markdown },
    workspaceRoot: workspace,
    requestId: 1,
    isWorkspaceTrusted: () => true,
    plantUmlEngine: "builtin",
  });
  return { root, workspace, documentPath, html: rendered.html };
}

interface Cell {
  readonly name: string;
  readonly darkBackground: boolean;
  readonly lineNumbers: boolean;
  readonly deviceScaleFactor?: number;
  readonly toc?: boolean;
}

const DEFAULTS: Cell = { name: "defaults", darkBackground: true, lineNumbers: true };

/** The preview page of a cell: its code block settings travel in the boot context, as the host sends them. */
async function buildPage(rendered: Rendered, cell: Cell): Promise<string> {
  const { root, workspace, documentPath, html } = rendered;
  const assets = fakeAssetResolver({ cspSource: "file:", url: (filePath) => pathToFileURL(filePath).href, extensionRoot: root });
  const bundle = { ...assets, bundleUri: (...segments: string[]) => (segments[0] === "preview.js" ? assets.bundleUri(...segments) : undefined) };
  const context = {
    activeSourceFile: documentPath,
    documentId: pathToFileURL(documentPath).toString(),
    revision: 1,
    requestId: 1,
    previewThemeMode: "current" as const,
    initialViewPreferences: {
      zoom: 100, widthMode: "margin" as const, toc: cell.toc === true, incomingChanges: true, comments: true, toolbarCollapsed: true,
    },
    "codeBlocks.darkBackground": cell.darkBackground,
    "codeBlocks.lineNumbers": cell.lineNumbers,
  };
  const built = await buildPreviewWebviewHtml(createNodeFileSystem(),
    html, workspace, bundle, context, workspace, undefined, COLUMN + GUTTER * 2, true, [], "builtin",
  );
  const pagePath = path.join(root, "page.html");
  fs.writeFileSync(pagePath, built.html);
  return pagePath;
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

/** Opens the page of a cell and gives it to `body`; skips or fails the test without Chromium. */
async function withPage(t: TestContext, cell: Cell, body: (page: Page) => Promise<void>): Promise<void> {
  let browser: Browser;
  try {
    browser = await chromium.launch();
  } catch (error) {
    launchError = error;
    chromiumUnavailable(t);
    return;
  }
  let rendered: Rendered | undefined;
  try {
    rendered = await renderDocument();
    const pagePath = await buildPage(rendered, cell);
    const page = await browser.newPage({
      viewport: { width: PANE, height: 1400 }, deviceScaleFactor: cell.deviceScaleFactor ?? 1,
    });
    await page.addInitScript(() => {
      (window as unknown as { acquireVsCodeApi: () => unknown }).acquireVsCodeApi = () => ({
        getState: () => ({}), setState: () => undefined, postMessage: () => undefined,
      });
    });
    await page.goto(pathToFileURL(pagePath).href);
    await pinTestFonts(page);
    await page.waitForFunction(() => document.documentElement.getAttribute("data-sphinx-preview-width") === "margin");
    await body(page);
  } finally {
    await browser.close();
    if (rendered) fs.rmSync(rendered.root, { recursive: true, force: true });
  }
}

interface Block {
  readonly kind: Kind;
  readonly length: number;
  readonly topLevel: boolean;
  /** The block that may break out: the `pre`, or the figure of a captioned one. */
  readonly wide: boolean;
  readonly breakout: string;
  readonly shift: string;
  readonly left: number;
  readonly width: number;
  readonly clientWidth: number;
  readonly scrollWidth: number;
  /** The width of the caption bar of a captioned block. */
  readonly captionWidth: number | null;
}

interface Layout {
  readonly column: number;
  readonly columnLeft: number;
  readonly pane: number;
  readonly reserve: number;
  readonly pageOverflow: number;
  /** Elements marked wide anywhere in the content. */
  readonly marked: number;
  readonly blocks: Block[];
}

/** Settles the layout passes, then reads the geometry of the page and every code block. */
async function measure(page: Page): Promise<Layout> {
  await page.evaluate(async () => {
    await document.fonts.ready;
    window.dispatchEvent(new Event("resize"));
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  return page.evaluate(() => {
    const content = document.getElementById("sphinx-myst-preview-content")!;
    const style = getComputedStyle(content);
    const root = document.documentElement;
    const blocks = [...content.querySelectorAll("pre")].map((pre) => {
      const name = /(plain|python|diff|captioned|listed|huge)(\d{3})/u.exec(pre.textContent ?? "")!;
      const figure = pre.parentElement!.tagName === "FIGURE" ? pre.parentElement! : null;
      const wrapper = (figure ?? pre) as HTMLElement;
      const box = wrapper.getBoundingClientRect();
      const caption = figure?.querySelector("figcaption");
      return {
        kind: name[1] as "plain",
        length: Number(name[2]),
        topLevel: wrapper.parentElement === content,
        wide: wrapper.hasAttribute("data-sphinx-preview-wide"),
        breakout: wrapper.style.getPropertyValue("--sphinx-preview-breakout"),
        shift: wrapper.style.getPropertyValue("--sphinx-preview-breakout-shift"),
        left: box.left,
        width: box.width,
        clientWidth: pre.clientWidth,
        scrollWidth: pre.scrollWidth,
        captionWidth: caption ? caption.getBoundingClientRect().width : null,
      };
    });
    return {
      column: content.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
      columnLeft: content.getBoundingClientRect().left + parseFloat(style.paddingLeft),
      pane: root.clientWidth,
      reserve: parseFloat(getComputedStyle(root).getPropertyValue("--sphinx-preview-toc-reserve")) || 0,
      pageOverflow: root.scrollWidth - root.clientWidth,
      marked: content.querySelectorAll("[data-sphinx-preview-wide]").length,
      blocks,
    };
  });
}

/** Clicks the Width button (margin, auto, full width, margin) and waits for the mode. */
async function nextWidthMode(page: Page, mode: "margin" | "auto" | "full"): Promise<void> {
  await page.evaluate(() => document.querySelector<HTMLElement>("[data-sphinx-preview-width-toggle]")!.click());
  await page.waitForFunction((expected) => document.documentElement.getAttribute("data-sphinx-preview-width") === expected, mode);
}

/** The settings of the cell reached the stylesheet: the diff block's border, the numbered block's inset. */
async function assertCellApplied(page: Page, cell: Cell): Promise<void> {
  const style = await page.evaluate(() => {
    const pres = [...document.querySelectorAll("#sphinx-myst-preview-content > pre")];
    const diff = pres.find((pre) => (pre.textContent ?? "").includes("diff070"))!;
    const numbered = pres.find((pre) => (pre.textContent ?? "").includes("python070"))!;
    const code = numbered.querySelector("code")!;
    return {
      diffBorder: getComputedStyle(diff).borderLeftWidth,
      inset: getComputedStyle(numbered.querySelector(".myst-code-line")!).paddingInlineStart,
      font: getComputedStyle(code).fontFamily,
      loaded: document.fonts.check(`14px "${getComputedStyle(code).fontFamily.split(",")[0]!.replace(/["']/gu, "")}"`),
    };
  });
  assert.ok(style.font.includes(PINNED_MONO_FAMILY) && style.loaded, `the code is drawn in the pinned font (${style.font})`);
  if (!cell.darkBackground) assert.equal(style.diffBorder, "0px", "dark background off: the diff block has no border");
  else if ((cell.deviceScaleFactor ?? 1) === 1) assert.equal(style.diffBorder, "1px", "dark background: the diff block has a border");
  // Under display scaling the browser snaps the 1 px border to device pixels (0.8 px at 125 %).
  else assert.ok(parseFloat(style.diffBorder) > 0, `dark background: the diff block has a border (${style.diffBorder})`);
  if (cell.lineNumbers) assert.ok(parseFloat(style.inset) > 0, `line numbers: the numbered block has an inset (${style.inset})`);
  else assert.equal(style.inset, "0px", "line numbers off: no inset");
}

const keyOf = (block: Block): string => label(block.kind, block.length);
const overflows = (block: Block): boolean => block.scrollWidth > block.clientWidth;
const numbers = (block: Block): string => `${keyOf(block)} ${block.width.toFixed(1)}${block.wide ? "W" : "s"} ${block.clientWidth}/${block.scrollWidth}`;

/** One line per block kind: width, wide (W) or in its container (s), client/scroll width of the code. */
function report(t: TestContext, name: string, layout: Layout): void {
  t.diagnostic(`${name}: column ${layout.column}, pane ${layout.pane}, TOC reserve ${layout.reserve}`);
  for (const kind of [...KINDS, "huge"]) {
    t.diagnostic(`${name} ${layout.blocks.filter((block) => block.kind === kind).map(numbers).join("; ")}`);
  }
}

/** Margin and Full width: nothing is marked; in Margin every block wider than the column scrolls in it. */
function checkNothingMarked(mode: string, layout: Layout, margin: Layout): string[] {
  const problems: string[] = layout.marked === 0 ? [] : [`${mode}: ${layout.marked} elements marked wide`];
  if (mode === "full") return problems;
  layout.blocks.forEach((block, index) => {
    const before = margin.blocks[index]!;
    if (overflows(block) !== overflows(before) || Math.abs(block.width - before.width) > 0.5 || (block.topLevel && block.width > layout.column + 0.5)) {
      problems.push(`${mode}: ${numbers(block)}, first Margin ${numbers(before)}`);
    }
  });
  return problems;
}

type Regime = "fits" | "breakout" | "capped";

/** What Auto does to every block, judged from its needed width as read in Margin. */
function checkAuto(margin: Layout, auto: Layout): { problems: string[]; seen: Set<string> } {
  const problems: string[] = [];
  const seen = new Set<string>();
  const available = auto.pane - auto.reserve - AREA_GUTTERS;
  const centre = (auto.pane - auto.reserve) / 2;
  if (auto.pageOverflow > 1) problems.push(`the page scrolls sideways by ${auto.pageOverflow} px`);
  auto.blocks.forEach((block, index) => {
    const before = margin.blocks[index]!;
    const fail = (message: string): void => {
      problems.push(`${message}: needs ${needed.toFixed(1)}, Auto ${numbers(block)}`);
    };
    // The width the block needs: its box, with the borders, around the whole content of its code.
    const needed = before.width - before.clientWidth + before.scrollWidth;
    if (!block.topLevel) {
      if (block.wide || block.breakout !== "") fail("a code block in a list item is marked");
      if (overflows(before) !== overflows(block)) fail("a code block in a list item no longer scrolls as in Margin");
      if (overflows(block)) seen.add(`${block.kind} scrolls`);
      return;
    }
    const regime: Regime = needed <= auto.column + 0.5 ? "fits" : Math.ceil(needed) <= available ? "breakout" : "capped";
    seen.add(`${block.kind} ${regime}`);
    if (regime === "fits") {
      if (block.wide || block.breakout !== "" || block.shift !== "") fail("a block that fits is marked");
      if (overflows(block)) fail("a block that fits scrolls");
      if (Math.abs(block.left - auto.columnLeft) > 0.5) fail(`a block that fits moved (left ${block.left}, column ${auto.columnLeft})`);
      return;
    }
    if (!block.wide) fail("a block wider than the column is not marked");
    if (regime === "breakout" && overflows(block)) fail(`a scroll bar stays (${block.scrollWidth - block.clientWidth} px)`);
    if (regime === "capped") {
      if (Math.abs(block.width - available) > 1) fail(`not capped at the available ${available} px`);
      if (!overflows(block)) fail("a block wider than the available area does not scroll");
    }
    if (Math.abs(block.left + block.width / 2 - centre) > 2) fail(`not centred on ${centre} (${(block.left + block.width / 2).toFixed(1)})`);
    if (block.captionWidth !== null && Math.abs(block.captionWidth - block.width) > 0.5) {
      fail(`the caption bar is ${block.captionWidth} px wide`);
    }
  });
  return { problems, seen };
}

/** Margin, Auto, Full width and Margin again on the page of a cell. */
async function checkCell(t: TestContext, cell: Cell): Promise<void> {
  await withPage(t, cell, async (page) => {
    await assertCellApplied(page, cell);
    const margin = await measure(page);
    assert.equal(margin.column, COLUMN, "the column is 688 px wide");
    assert.equal(margin.reserve, cell.toc ? TOC_RESERVE : 0, "the TOC reserve of the cell");
    assert.equal(margin.blocks.length, LENGTHS.length * KINDS.length + 1, "every fence renders one code block");
    report(t, `${cell.name} margin`, margin);
    const problems = checkNothingMarked("margin", margin, margin);
    await nextWidthMode(page, "auto");
    const auto = await measure(page);
    report(t, `${cell.name} auto`, auto);
    // A captioned block without its figure and figcaption would skip the caption bar width check.
    assert.equal(auto.blocks.filter((block) => block.kind === "captioned" && block.captionWidth !== null).length, LENGTHS.length,
      `${cell.name}: every captioned block renders as a figure with a figcaption`);
    const checked = checkAuto(margin, auto);
    problems.push(...checked.problems);
    // The lengths cross the column and the available area for every kind, so no case goes unchecked.
    for (const kind of KINDS.filter((candidate) => candidate !== "listed")) {
      for (const regime of ["fits", "breakout", "capped"]) {
        assert.ok(checked.seen.has(`${kind} ${regime}`), `${cell.name}: no ${kind} block ${regime}`);
      }
    }
    assert.ok(checked.seen.has("listed scrolls"), `${cell.name}: no code block in a list item scrolls`);
    await nextWidthMode(page, "full");
    problems.push(...checkNothingMarked("full", await measure(page), margin));
    await nextWidthMode(page, "margin");
    problems.push(...checkNothingMarked("margin", await measure(page), margin));
    assert.equal(problems.length, 0, `${cell.name}: ${problems.length} problems\n${problems.join("\n")}`);
  });
}

// @tests_req SwRS-MDOKFSTUDIO-LAYOUT-023
test("Auto fits a code block's longest line (shipped code block settings)", async (t) => {
  await checkCell(t, DEFAULTS);
});

// @tests_req SwRS-MDOKFSTUDIO-LAYOUT-023
test("Auto fits a code block's longest line with the dark background off", async (t) => {
  await checkCell(t, { name: "dark background off", darkBackground: false, lineNumbers: true });
});

// @tests_req SwRS-MDOKFSTUDIO-LAYOUT-023
test("Auto fits a code block's longest line with line numbers off", async (t) => {
  await checkCell(t, { name: "line numbers off", darkBackground: true, lineNumbers: false });
});

// @tests_req SwRS-MDOKFSTUDIO-LAYOUT-023
test("Auto fits a code block's longest line with the dark background and line numbers off", async (t) => {
  await checkCell(t, { name: "both off", darkBackground: false, lineNumbers: false });
});

// @tests_req SwRS-MDOKFSTUDIO-LAYOUT-023
test("Auto neither marks nor shifts a code block that fits at a display scaling of 125 %", async (t) => {
  await checkCell(t, { ...DEFAULTS, name: "scaling 125 %", deviceScaleFactor: 1.25 });
});

// @tests_req SwRS-MDOKFSTUDIO-LAYOUT-023
test("Auto caps a code block at the area left of the open table of contents", async (t) => {
  await checkCell(t, { ...DEFAULTS, name: "TOC open", toc: true });
});
