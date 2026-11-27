/**
 * Requirement tests, in Chromium on the real preview, of what follows an unmoved selection after the
 * content under it changes, or a switch of the page hides part of it: the selected text a scroll
 * report carries and the Comment button. The page reads the selection as little as it can (issue 547)
 * and must read it again then. No selection change is announced for such a change. Skipped, with a
 * message, when no Chromium can start here, unless STUDIO_REQUIRE_CHROMIUM=1 (the `visual` CI job
 * runs it with it, see `just ci-visual 1`).
 */
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { after, test, type TestContext } from "node:test";
import { pathToFileURL } from "node:url";

import { chromium, type Browser, type Page } from "playwright-core";

import type { FrontmatterResult } from "../../src/core/frontmatter/okfFrontmatter";
import { renderPreviewDocument } from "../../src/core/render/renderPipeline";
import { createNodeFileSystem } from "../../src/node-services/nodeFileSystem";
import { buildPreviewWebviewHtml } from "../../src/session/webview";
import { fakeAssetResolver } from "../shared/fakeAssets";
import { pageRuntimeScript } from "./runtimeHarness";

const TIMEOUT_MS = 30_000;
const MARKDOWN = `# Title\n\nAlpha paragraph.\n\nBravo paragraph.\n\nCharlie paragraph.\n\n${"Filler paragraph.\n\n".repeat(80)}`;

/** The properties table the page shows above the document, with one value. */
const PROPERTIES: FrontmatterResult = {
  present: true,
  fields: [{
    name: "status", value: "zulu", valueKind: "scalar", nullable: false, fieldType: "text",
    doc: null, enums: null, issues: [], known: true,
  }],
  orderMode: "yaml",
  schemaFound: false,
  missingRequiredFields: [],
  info: [],
  summary: { errors: 0, warnings: 0, infos: 0 },
};

const roots: string[] = [];
after(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true, maxRetries: 5 });
});

async function buildPage(): Promise<string> {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "frame-reads-")));
  roots.push(root);
  const documentPath = path.join(root, "doc.md");
  fs.mkdirSync(path.join(root, "out", "bundle"), { recursive: true });
  fs.writeFileSync(path.join(root, "out", "bundle", "preview.js"), pageRuntimeScript());
  const rendered = await renderPreviewDocument({
    files: createNodeFileSystem(),
    document: { uri: { scheme: "file", fsPath: documentPath }, languageId: "markdown", version: 1, getText: () => MARKDOWN },
    workspaceRoot: root,
    requestId: 1,
    isWorkspaceTrusted: () => true,
  });
  const assets = fakeAssetResolver({ cspSource: "file:", url: (filePath) => pathToFileURL(filePath).href, extensionRoot: root });
  const bundle = { ...assets, bundleUri: (...segments: string[]) => (segments[0] === "preview.js" ? assets.bundleUri(...segments) : undefined) };
  const built = await buildPreviewWebviewHtml(createNodeFileSystem(), rendered.html, root, bundle, {
    activeSourceFile: documentPath,
    documentId: pathToFileURL(documentPath).toString(),
    revision: 1,
    requestId: 1,
    previewThemeMode: "current" as const,
    commentsEnabled: true,
  }, root, { result: PROPERTIES, tableEnabled: true }, 800, true, [], "builtin");
  const pagePath = path.join(root, "page.html");
  fs.writeFileSync(pagePath, built.html);
  return pagePath;
}

/** A browser, or undefined after the test was skipped for the lack of one. */
async function launch(t: TestContext): Promise<Browser | undefined> {
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

/** A new tab on the built preview, once its page script is ready. */
async function openPage(browser: Browser, pagePath: string): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  await page.addInitScript(() => {
    const posted: unknown[] = [];
    Object.assign(window, {
      __posted: posted,
      acquireVsCodeApi: () => ({
        getState: () => ({}), setState: () => undefined, postMessage: (message: unknown) => { posted.push(message); },
      }),
    });
  });
  await page.goto(pathToFileURL(pagePath).href);
  await page.waitForFunction(() => (window as unknown as { __posted: Array<{ type: string }> }).__posted
    .some((message) => message.type === "previewReady"), undefined, { timeout: TIMEOUT_MS });
  await drawn(page);
  return page;
}

/**
 * Lets the page draw twice: what waits for a frame has run, and so has the layout pass of a height
 * change. A scroll that comes before that pass is taken back by it, and the page reports nothing.
 */
const drawn = (page: Page): Promise<void> => page.evaluate(() => new Promise<void>((resolve) => {
  requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
}));

// @tests_req SwRS-MDOKFSTUDIO-LIFE-108#S11
test("a scroll report carries the new text after the content under an unmoved selection changes", { timeout: 180_000 }, async (t) => {
  const pagePath = await buildPage();
  const browser = await launch(t);
  if (!browser) return;
  try {
    const page = await openPage(browser, pagePath);
    // From the first paragraph to the third one.
    await page.evaluate(() => {
      const paragraphs = [...document.querySelectorAll("#sphinx-myst-preview-content p")];
      window.getSelection()!.setBaseAndExtent(paragraphs[0]!.firstChild!, 0, paragraphs[2]!.firstChild!, 7);
    });

    /** Scrolls and answers with the selected text of the report that follows. */
    const scrolledText = async (top: number): Promise<string> => {
      await drawn(page);
      const before = await page.evaluate((next) => {
        const count = (window as unknown as { __posted: unknown[] }).__posted.length;
        window.scrollTo({ top: next, behavior: "instant" });
        return count;
      }, top);
      const report = await page.waitForFunction(([from, wanted]) => (window as unknown as {
        __posted: Array<{ type: string; scrollTop?: number; selectedText?: string }>;
      }).__posted.slice(from).find((message) => (message.type === "previewScroll" || message.type === "previewState")
        && message.scrollTop === wanted), [before, top] as const, { timeout: TIMEOUT_MS });
      return (await report.jsonValue() as { selectedText?: string }).selectedText ?? "";
    };

    assert.match(await scrolledText(100), /Alpha[\s\S]*Bravo[\s\S]*Charlie/u);
    assert.match(await scrolledText(200), /Alpha[\s\S]*Bravo[\s\S]*Charlie/u);
    // Hidden: the selection stays where it is and its text is another one.
    await page.evaluate(() => { (document.querySelectorAll("#sphinx-myst-preview-content p")[1] as HTMLElement).hidden = true; });
    const hidden = await scrolledText(300);
    assert.match(hidden, /Alpha[\s\S]*Charlie/u);
    assert.doesNotMatch(hidden, /Bravo/u);
    // Typed over inside a selected paragraph.
    await page.evaluate(() => {
      const paragraph = document.querySelectorAll("#sphinx-myst-preview-content p")[1] as HTMLElement;
      paragraph.hidden = false;
      paragraph.append(" Delta.");
    });
    assert.match(await scrolledText(400), /Bravo paragraph\. Delta\./u);
    // Hidden by a style, shown again, then hidden by a class.
    const bravo = page.locator("#sphinx-myst-preview-content p").nth(1);
    await bravo.evaluate((paragraph) => { paragraph.style.display = "none"; });
    assert.doesNotMatch(await scrolledText(500), /Bravo/u);
    await bravo.evaluate((paragraph) => { paragraph.style.display = ""; });
    assert.match(await scrolledText(600), /Bravo/u);
    await bravo.evaluate((paragraph) => { paragraph.classList.add("myst-toctree-hidden"); });
    assert.doesNotMatch(await scrolledText(700), /Bravo/u);
    // Collapsed by a button of the page: the page root says so, and nothing changes in the content.
    await page.evaluate(() => {
      const table = document.querySelector("#sphinx-myst-preview-content [data-okf-properties]")!;
      const first = document.querySelector("#sphinx-myst-preview-content p")!;
      window.getSelection()!.setBaseAndExtent(table, 0, first.firstChild!, 5);
    });
    assert.match(await scrolledText(0), /zulu[\s\S]*Alpha/u);
    await page.evaluate(() => { (document.querySelector("[data-okf-frontmatter-toggle]") as HTMLElement).click(); });
    const collapsed = await scrolledText(100);
    assert.match(collapsed, /Alpha/u);
    assert.doesNotMatch(collapsed, /zulu/u);
  } finally {
    await browser.close();
  }
});

const BUTTON = "[data-okf-comment-create]";
const BOX = "[data-okf-comment-compose]";
const PARAGRAPHS = "#sphinx-myst-preview-content p";

async function scrollDown(page: Page): Promise<void> {
  await page.evaluate(() => window.scrollBy({ top: 40, behavior: "instant" }));
  await drawn(page);
}

/** Selects from the start of one paragraph to the seventh character of another, and waits for the button. */
async function selectParagraphs(page: Page, from: number, to: number): Promise<void> {
  await page.$$eval(PARAGRAPHS, (all, [first, last]) => {
    window.getSelection()!.setBaseAndExtent(all[first!]!.firstChild!, 0, all[last!]!.firstChild!, 7);
  }, [from, to]);
  await page.waitForSelector(BUTTON, { timeout: TIMEOUT_MS });
}

/** Where the button is, and where it belongs for the selected text as it is now. */
const buttonPlace = (page: Page): Promise<{ top: number | undefined; belongs: number }> => page.evaluate((selector) => {
  const button = document.querySelector<HTMLElement>(selector);
  const bottom = window.getSelection()!.getRangeAt(0).getBoundingClientRect().bottom;
  return {
    top: button ? Math.round(parseFloat(button.style.top)) : undefined,
    belongs: Math.round(Math.max(8, Math.min(bottom + 6, window.innerHeight - 48))),
  };
}, BUTTON);

/** A change of the second paragraph, run in the page. */
const second = (change: (paragraph: HTMLElement) => void | Promise<void>) => (page: Page): Promise<unknown> =>
  page.locator(PARAGRAPHS).nth(1).evaluate(change);

interface Change {
  name: string;
  /** The first and the last selected paragraph; the second one alone when not given. */
  select?: [number, number];
  apply(page: Page): Promise<unknown>;
  /** Whether the scroll after the change leaves a button. */
  button: boolean;
  /** Whether the text can be shown again by the end, so that the shortcut still comments on it. */
  shownAgain?: boolean;
}

const CHANGES: Change[] = [
  { name: "the selected block is removed", apply: second((p) => p.remove()), button: false },
  { name: "the selected text node is removed", apply: second((p) => { p.firstChild!.remove(); }), button: false },
  {
    name: "the content is replaced",
    apply: (page) => page.locator("#sphinx-myst-preview-content").evaluate((main) => { main.innerHTML = `${main.innerHTML}`; }),
    button: false,
  },
  { name: "the block gets the hidden attribute", apply: second((p) => { p.hidden = true; }), button: false },
  { name: "the block is not displayed", apply: second((p) => { p.style.display = "none"; }), button: false },
  { name: "the block is invisible", apply: second((p) => { p.style.visibility = "hidden"; }), button: false },
  { name: "a class hides the block", apply: second((p) => { p.classList.add("myst-toctree-hidden"); }), button: false },
  {
    name: "all three selected blocks are hidden",
    select: [0, 2],
    apply: (page) => page.$$eval(PARAGRAPHS, (all) => { for (const p of all.slice(0, 3)) (p as HTMLElement).hidden = true; }),
    button: false,
  },
  {
    name: "the first of three selected blocks is removed",
    select: [0, 2],
    apply: (page) => page.locator(PARAGRAPHS).first().evaluate((p) => p.remove()),
    button: false,
  },
  { name: "the middle of three selected blocks is removed", select: [0, 2], apply: second((p) => p.remove()), button: true },
  {
    name: "the block is hidden, the page scrolls, the block shows again",
    apply: async (page) => {
      await second((p) => { p.hidden = true; })(page);
      await drawn(page);
      await scrollDown(page);
      await second((p) => { p.hidden = false; })(page);
    },
    button: false,
    shownAgain: true,
  },
  {
    name: "the block is hidden and shows again before any scroll",
    apply: async (page) => {
      await second((p) => { p.hidden = true; })(page);
      await drawn(page);
      await second((p) => { p.hidden = false; })(page);
    },
    button: true,
  },
  {
    name: "the block is removed in the task that scrolls",
    apply: second((p) => { p.remove(); window.scrollBy({ top: 30, behavior: "instant" }); }),
    button: false,
  },
  {
    name: "the block is hidden in the task that scrolls",
    apply: second((p) => { p.hidden = true; window.scrollBy({ top: 30, behavior: "instant" }); }),
    button: false,
  },
  {
    name: "the block is removed in a frame callback and the next frame scrolls",
    apply: second((p) => new Promise<void>((resolve) => {
      requestAnimationFrame(() => { p.remove(); window.scrollBy({ top: 30, behavior: "instant" }); resolve(); });
    })),
    button: false,
  },
];

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-038#S9
test("a scroll after the page took away or hid the selected text removes the Comment button", { timeout: 180_000 }, async (t) => {
  const pagePath = await buildPage();
  const browser = await launch(t);
  if (!browser) return;
  const wrong: string[] = [];
  try {
    for (const change of CHANGES) {
      const page = await openPage(browser, pagePath);
      const [from, to] = change.select ?? [1, 1];
      await selectParagraphs(page, from, to);
      await change.apply(page);
      await drawn(page);
      await scrollDown(page);
      if (change.button) {
        const place = await buttonPlace(page);
        if (place.top !== place.belongs) wrong.push(`${change.name}: the button is at ${place.top}, not ${place.belongs}`);
      } else {
        if (await page.locator(BUTTON).count() !== 0) wrong.push(`${change.name}: a button stays`);
        // The shortcut finds nothing to comment on, unless the text shows again.
        await page.keyboard.press("Control+Alt+KeyM");
        const boxes = await page.locator(BOX).count();
        if (boxes !== (change.shownAgain ? 1 : 0)) wrong.push(`${change.name}: the shortcut opens ${boxes} box(es)`);
      }
      await page.close();
    }
    assert.deepEqual(wrong, []);
  } finally {
    await browser.close();
  }
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-038#S8
// @tests_req SwRS-MDOKFSTUDIO-REVIEW-038#S9
test("a change of the page has the selection read again, once, and a scroll never does", { timeout: 180_000 }, async (t) => {
  const pagePath = await buildPage();
  const browser = await launch(t);
  if (!browser) return;
  try {
    const page = await openPage(browser, pagePath);
    await selectParagraphs(page, 1, 1);
    await drawn(page);
    // Of the page's code, only the Comment button asks the selection for its range.
    await page.evaluate(() => {
      const counted = window as unknown as { __reads: number };
      counted.__reads = 0;
      const original = Selection.prototype.getRangeAt;
      Selection.prototype.getRangeAt = function getRangeAt(this: Selection, index: number): Range {
        counted.__reads += 1;
        return original.call(this, index);
      };
    });
    const reads = (): Promise<number> => page.evaluate(() => (window as unknown as { __reads: number }).__reads);
    for (let index = 0; index < 4; index += 1) await scrollDown(page);
    assert.equal(await reads(), 0, "scrolls in read mode");
    await page.$$eval(PARAGRAPHS, (all) => { for (const p of all.slice(3, 8)) p.append(" More."); });
    await drawn(page);
    assert.equal(await reads(), 1, "five changes in one task are read once");
    for (let index = 0; index < 2; index += 1) await scrollDown(page);
    assert.equal(await reads(), 1, "the scrolls after the change read nothing");
    assert.equal(await page.locator(BUTTON).count(), 1);
    await page.locator("[data-edit-mode]").first().evaluate((toggle) => (toggle as HTMLElement).click());
    // The click has the selection read again in a timer of no delay: one set after it runs after it.
    await page.evaluate(() => new Promise<void>((resolve) => { setTimeout(resolve, 0); }));
    await drawn(page);
    const before = await reads();
    for (let index = 0; index < 4; index += 1) await scrollDown(page);
    assert.equal(await reads(), before, "scrolls in edit mode");
    assert.equal(await page.locator(BUTTON).count(), 1);
  } finally {
    await browser.close();
  }
});
