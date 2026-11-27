/**
 * Requirement test of the layout with and without an image, figure or table aligned left or right,
 * in Chromium on the real preview (render pipeline, stylesheet, page runtime) and on the exported
 * file: without one, the top-level boxes start below the toolbar float; with one, the page has no
 * toolbar float, no box clears it and the top-level headings clear both sides. The same holds in a
 * page and a file with no page script, and the layout switches after a change of the content (by the
 * page itself or by a content patch). Skipped, with a message, when no Chromium can start here,
 * unless STUDIO_REQUIRE_CHROMIUM=1 (the `visual` CI job runs it with it, see `just ci-visual 1`).
 */
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { after, test } from "node:test";
import { pathToFileURL } from "node:url";

import { chromium, type Browser, type Page } from "playwright-core";

import { buildHtmlExport } from "../../src/core/export/htmlExport";
import { extractMainContent } from "../../src/core/preview/contentPatch";
import { renderPreviewDocument } from "../../src/core/render/renderPipeline";
import { createNodeFileSystem } from "../../src/node-services/nodeFileSystem";
import { buildPreviewWebviewHtml } from "../../src/session/webview";
import { fakeAssetResolver } from "../shared/fakeAssets";
import { pageRuntimeScript } from "./runtimeHarness";

const VIEWPORT = { width: 900, height: 700 };
const TIMEOUT_MS = 30_000;

/** A heading, a paragraph, a code block and a table, with `extra` between the heading and the text. */
const markdownWith = (extra: string): string =>
  `# Title\n\n## Section\n\n${extra}Running text.\n\n\`\`\`python\nx = 1\n\`\`\`\n\n| a |\n| - |\n| 1 |\n\n## Next\n\nMore text.\n`;

const PLAIN = markdownWith("");
const FLOATED = markdownWith('<table align="right"><tr><td>aside</td></tr></table>\n\n');

interface Layout {
  /** Whether the content root says that it holds an aligned float. */
  marked: boolean;
  /** The display of the toolbar float, the `::before` of the content root. */
  toolbarFloat: string;
  /** The `clear` values of the top-level headings, paragraphs and boxes. */
  headings: string[];
  paragraphs: string[];
  boxes: string[];
}

const WITHOUT_FLOAT = { marked: false, toolbarFloat: "block", headings: "none", paragraphs: "none", boxes: "right" };
const WITH_FLOAT = { marked: true, toolbarFloat: "none", headings: "both", paragraphs: "none", boxes: "none" };

const layoutOf = (page: Page): Promise<Layout> => page.evaluate(() => {
  const main = document.getElementById("sphinx-myst-preview-content")!;
  // The blocks of the document: the aligned float under test is not one of the boxes.
  const children = Array.from(main.children).filter((child) => !child.matches(
    '[hidden], .sphinx-preview-insert-point, .okf-anchor-row, div.okf-comment, [align], .align-left, .align-right'));
  const clears = (selector: string): string[] => children.filter((child) => child.matches(selector))
    .map((child) => getComputedStyle(child).clear);
  return {
    marked: main.hasAttribute("data-okf-aligned-float"),
    toolbarFloat: getComputedStyle(main, "::before").display,
    headings: clears("h1, h2, h3, h4, h5, h6"),
    paragraphs: clears("p:not([data-sphinx-preview-figure])"),
    boxes: clears(":not(h1, h2, h3, h4, h5, h6, p, ul, ol, dl)"),
  };
});

function assertLayout(layout: Layout, expected: typeof WITHOUT_FLOAT, when: string): void {
  assert.equal(layout.marked, expected.marked, `${when}: the mark of the content root`);
  assert.equal(layout.toolbarFloat, expected.toolbarFloat, `${when}: the toolbar float`);
  for (const kind of ["headings", "paragraphs", "boxes"] as const) {
    assert.ok(layout[kind].length > 0, `${when}: the page has ${kind}`);
    assert.deepEqual(layout[kind], layout[kind].map(() => expected[kind]), `${when}: clear of the ${kind}`);
  }
}

/** Waits for two frames: what the page draws after a change is drawn. */
const twoFrames = (page: Page): Promise<void> => page.evaluate(() => new Promise<void>((resolve) => {
  requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
}));

const roots: string[] = [];
after(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true, maxRetries: 5 });
});

async function renderPages(): Promise<{ plain: string; floated: string; identity: Record<string, unknown>; root: string }> {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "aligned-float-")));
  roots.push(root);
  const documentPath = path.join(root, "doc.md");
  fs.mkdirSync(path.join(root, "out", "bundle"), { recursive: true });
  fs.writeFileSync(path.join(root, "out", "bundle", "preview.js"), pageRuntimeScript());
  const assets = fakeAssetResolver({ cspSource: "file:", url: (filePath) => pathToFileURL(filePath).href, extensionRoot: root });
  const bundle = { ...assets, bundleUri: (...segments: string[]) => (segments[0] === "preview.js" ? assets.bundleUri(...segments) : undefined) };
  const identity = { documentId: pathToFileURL(documentPath).toString(), revision: 1, requestId: 1 };
  const build = async (markdown: string): Promise<string> => {
    const rendered = await renderPreviewDocument({
      files: createNodeFileSystem(),
      document: { uri: { scheme: "file", fsPath: documentPath }, languageId: "markdown", version: 1, getText: () => markdown },
      workspaceRoot: root,
      requestId: 1,
      isWorkspaceTrusted: () => true,
    });
    const built = await buildPreviewWebviewHtml(createNodeFileSystem(), rendered.html, root, bundle, {
      activeSourceFile: documentPath,
      ...identity,
      previewThemeMode: "current" as const,
      initialViewPreferences: { zoom: 100, widthMode: "auto" as const, toc: false, incomingChanges: true, comments: true, toolbarCollapsed: false },
    }, root, undefined, VIEWPORT.width, true, [], "builtin");
    return built.html;
  };
  return { plain: await build(PLAIN), floated: await build(FLOATED), identity, root };
}

/** A Chromium, or undefined (test skipped) where none can start and none is required. */
async function startChromium(t: { skip(message: string): void }): Promise<Browser | undefined> {
  try {
    return await chromium.launch();
  } catch (error) {
    if (process.env.STUDIO_REQUIRE_CHROMIUM === "1") {
      throw new Error(`Chromium is required (STUDIO_REQUIRE_CHROMIUM=1) and cannot start: ${
        error instanceof Error ? error.message : String(error)}`);
    }
    t.skip("no Chromium can start here (run `just dev` to install it)");
    return undefined;
  }
}

// @tests_req SwRS-MDOKFSTUDIO-LAYOUT-043#S6
// @tests_req SwRS-MDOKFSTUDIO-LAYOUT-043#S8
test("a page and an exported file with no page script lay out with and without an aligned float", { timeout: 180_000 }, async (t) => {
  const { plain, floated, root } = await renderPages();
  const exported = (html: string): string => buildHtmlExport({
    contentHtml: `<main id="sphinx-myst-preview-content">${extractMainContent(html)!.inner}</main>`,
    rootAttributes: {}, tokens: {}, mathStyles: "", shownTabs: [],
  }, { stem: "doc", maxContentWidth: 900, imageData: () => undefined }).html;
  const browser = await startChromium(t);
  if (!browser) return;
  try {
    const context = await browser.newContext({ viewport: VIEWPORT, javaScriptEnabled: false });
    const page = await context.newPage();
    const cases = [
      ["the page without a float", plain, WITHOUT_FLOAT],
      ["the page with a float", floated, WITH_FLOAT],
      ["the exported file without a float", exported(plain), WITHOUT_FLOAT],
      ["the exported file with a float", exported(floated), WITH_FLOAT],
    ] as const;
    for (const [index, [when, html, expected]] of cases.entries()) {
      const file = path.join(root, `case-${index}.html`);
      fs.writeFileSync(file, html);
      await page.goto(pathToFileURL(file).href);
      assertLayout(await layoutOf(page), expected, when);
    }
  } finally {
    await browser.close();
  }
});

// @tests_req SwRS-MDOKFSTUDIO-LAYOUT-043#S7
test("the layout switches when a change of the content adds the first aligned float or removes the last", { timeout: 180_000 }, async (t) => {
  const { plain, floated, identity, root } = await renderPages();
  const browser = await startChromium(t);
  if (!browser) return;
  try {
    const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 });
    await page.addInitScript(() => {
      Object.assign(window, {
        acquireVsCodeApi: () => ({ getState: () => ({}), setState: () => undefined, postMessage: () => undefined }),
      });
    });
    const file = path.join(root, "page.html");
    fs.writeFileSync(file, plain);
    await page.goto(pathToFileURL(file).href);
    await page.waitForFunction(() => document.documentElement.getAttribute("data-sphinx-preview-width") === "auto",
      undefined, { timeout: TIMEOUT_MS });
    await twoFrames(page);
    assertLayout(await layoutOf(page), WITHOUT_FLOAT, "at the start");

    // The page's own changes: an element added deep in the content, then removed.
    await page.evaluate(() => {
      const box = document.createElement("div");
      box.id = "added";
      box.hidden = true;
      box.innerHTML = '<figure class="align-left"></figure>';
      document.getElementById("sphinx-myst-preview-content")!.append(box);
    });
    await twoFrames(page);
    assertLayout(await layoutOf(page), WITH_FLOAT, "after an aligned figure was added");
    await page.evaluate(() => { document.getElementById("added")!.remove(); });
    await twoFrames(page);
    assertLayout(await layoutOf(page), WITHOUT_FLOAT, "after it was removed");

    // An attribute of an element that is already there.
    const align = (value: string | null): Promise<void> => page.evaluate((next) => {
      const table = document.querySelector("#sphinx-myst-preview-content table")!;
      if (next === null) table.removeAttribute("align");
      else table.setAttribute("align", next);
    }, value);
    await align("left");
    await twoFrames(page);
    assert.equal((await layoutOf(page)).marked, true, "a table that gets align=left");
    await align("center");
    await twoFrames(page);
    assertLayout(await layoutOf(page), WITHOUT_FLOAT, "a table aligned center");
    await align(null);

    // Content patches, in both directions.
    const patch = async (html: string, revision: number): Promise<void> => {
      await page.evaluate((data) => { window.dispatchEvent(new MessageEvent("message", { data })); }, {
        type: "previewContentPatch",
        documentId: identity.documentId,
        revision: revision - 1,
        requestId: revision - 1,
        next: { revision, requestId: revision },
        contentHtml: extractMainContent(html)!.inner,
        status: "success",
        label: "ready",
        diagnostics: [],
      });
      await page.waitForFunction((wanted) => document.documentElement.getAttribute("data-sphinx-preview-request-id") === wanted,
        String(revision), { timeout: TIMEOUT_MS });
      await twoFrames(page);
    };
    await patch(floated, 2);
    assertLayout(await layoutOf(page), WITH_FLOAT, "after a patch that adds the first aligned float");
    await patch(plain, 3);
    assertLayout(await layoutOf(page), WITHOUT_FLOAT, "after a patch that removes the last aligned float");
  } finally {
    await browser.close();
  }
});
