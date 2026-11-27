/**
 * Requirement test of what one comment creation costs in style work (issue 547): on the generated
 * large review document (`perf547Document`), saving one comment restyles at most 100 elements. The
 * page is the real preview (render pipeline, stylesheet, page runtime) in Chromium: the words are
 * selected, the Comment button opens the box, the text is typed, and the test plays the host's part
 * after Save (the result, then the threads with the new one). A Chromium trace counts the elements
 * of every style pass from the click on Save until the new highlight is drawn. Skipped, with a
 * message, when no Chromium can start here, unless STUDIO_REQUIRE_CHROMIUM=1 (the `visual` CI job
 * runs it with it, see `just ci-visual 1`).
 */
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { after, test } from "node:test";
import { pathToFileURL } from "node:url";

import { chromium, type Browser, type Page } from "playwright-core";

import { reanchorThreads } from "../../src/core/comments/anchoring";
import type { CommentThread } from "../../src/core/comments/commentModel";
import { renderPreviewDocument } from "../../src/core/render/renderPipeline";
import { createNodeFileSystem } from "../../src/node-services/nodeFileSystem";
import { buildPreviewWebviewHtml } from "../../src/session/webview";
import { PERF547_FILE, PERF547_SHAPE, perf547Document } from "../probe/perf547Document";
import { fakeAssetResolver } from "../shared/fakeAssets";
import { pageRuntimeScript } from "./runtimeHarness";

/** The most elements one comment creation may restyle. */
const RESTYLE_LIMIT = 100;
/** About the preview of the real-window measure. */
const VIEWPORT = { width: 670, height: 800 };
const NEW_THREAD = "t_0000000f";
const TIMEOUT_MS = 30_000;

/** The error of the last Chromium launch that failed, kept for the message of a required Chromium. */
let launchError: unknown;

interface HostPage {
  readonly browser: Browser;
  readonly page: Page;
  readonly threads: CommentThread[];
  /** Posts a message of the host to the page, with the identity of the shown render. */
  send(message: Record<string, unknown>): Promise<void>;
}

const roots: string[] = [];
after(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true, maxRetries: 5 });
});

async function openPage(): Promise<HostPage | undefined> {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "comment-restyle-")));
  roots.push(root);
  const workspace = path.join(root, "workspace");
  const files = perf547Document();
  for (const [relative, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(workspace, relative)), { recursive: true });
    fs.writeFileSync(path.join(workspace, relative), content);
  }
  const documentPath = path.join(workspace, PERF547_FILE);
  const markdown = files[PERF547_FILE]!;
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
  const assets = fakeAssetResolver({ cspSource: "file:", url: (filePath) => pathToFileURL(filePath).href, extensionRoot: root });
  const bundle = { ...assets, bundleUri: (...segments: string[]) => (segments[0] === "preview.js" ? assets.bundleUri(...segments) : undefined) };
  const identity = { documentId: pathToFileURL(documentPath).toString(), revision: 1, requestId: 1 };
  const built = await buildPreviewWebviewHtml(createNodeFileSystem(), rendered.html, workspace, bundle, {
    activeSourceFile: documentPath,
    ...identity,
    previewThemeMode: "current" as const,
    commentsEnabled: true,
    initialViewPreferences: { zoom: 100, widthMode: "auto" as const, toc: false, incomingChanges: true, comments: true, toolbarCollapsed: true },
  }, workspace, undefined, VIEWPORT.width, true, [], "builtin");
  const pagePath = path.join(root, "page.html");
  fs.writeFileSync(pagePath, built.html);
  const sidecar = JSON.parse(files[PERF547_FILE.replace(/\.md$/u, ".comments.json")]!) as { threads: CommentThread[] };
  const threads = reanchorThreads(markdown, sidecar.threads).threads;

  let browser: Browser;
  try {
    browser = await chromium.launch();
  } catch (error) {
    launchError = error;
    return undefined;
  }
  try {
    const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 });
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
    await page.waitForFunction(() => document.documentElement.getAttribute("data-sphinx-preview-width") === "auto",
      undefined, { timeout: TIMEOUT_MS });
    await page.waitForFunction(() => [...document.images].every((image) => image.complete), undefined, { timeout: TIMEOUT_MS });
    return {
      browser,
      page,
      threads,
      send: (message) => page.evaluate((data) => { window.dispatchEvent(new MessageEvent("message", { data })); },
        { ...identity, ...message }),
    };
  } catch (error) {
    await browser.close().catch(() => undefined);
    throw error;
  }
}

/**
 * Waits until the page is at rest: for ten frames in a row, no change of the DOM and no running
 * transition or animation. Work left over from before must not be counted, and work that is part of
 * the creation must be.
 */
const atRest = (page: Page): Promise<void> => page.evaluate(() => new Promise<void>((resolve) => {
  let still = 0;
  const observer = new MutationObserver(() => { still = 0; });
  observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true });
  const frame = (): void => {
    if (document.getAnimations().some((animation) => animation.playState === "running")) still = 0;
    still += 1;
    if (still <= 10) {
      requestAnimationFrame(frame);
      return;
    }
    observer.disconnect();
    resolve();
  };
  requestAnimationFrame(frame);
}));

interface TraceEvent {
  name: string;
  pid: number;
  tid: number;
  ts: number;
  args?: { elementCount?: number; endData?: { elementCount?: number } };
}

/** The element counts of the style passes of the page's main thread between the two marks. */
function restyledBetween(buffer: Buffer, startMark: string, endMark: string): number[] {
  const events = (JSON.parse(buffer.toString("utf8")) as { traceEvents: TraceEvent[] }).traceEvents;
  const start = events.find((event) => event.name === startMark);
  const end = events.find((event) => event.name === endMark);
  assert.ok(start && end, `the trace holds the marks ${startMark} and ${endMark} (${events.length} events)`);
  return events
    .filter((event) => event.name === "UpdateLayoutTree" && event.pid === start.pid && event.tid === start.tid
      && event.ts >= start.ts && event.ts <= end.ts)
    .flatMap((event) => event.args?.elementCount ?? event.args?.endData?.elementCount ?? []);
}

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-223#S1
test("saving one comment on a large document restyles at most 100 elements", { timeout: 180_000 }, async (t) => {
  const opened = await openPage();
  if (!opened) {
    if (process.env.STUDIO_REQUIRE_CHROMIUM === "1") {
      throw new Error(`Chromium is required (STUDIO_REQUIRE_CHROMIUM=1) and cannot start: ${
        launchError instanceof Error ? launchError.message : String(launchError)}`);
    }
    t.skip("no Chromium can start here (run `just dev` to install it)");
    return;
  }
  const { browser, page, threads, send } = opened;
  try {
    const highlights = (): Promise<number> => page.evaluate(() => document.querySelectorAll("mark[data-okf-comment-thread]").length);
    await send({ type: "previewComments", threads: threads.map((thread) => ({ ...thread, orphaned: false })) });
    await page.waitForFunction((wanted) => document.querySelectorAll("mark[data-okf-comment-thread]").length >= wanted,
      PERF547_SHAPE.threads, { timeout: TIMEOUT_MS });
    await atRest(page);
    assert.equal(await highlights(), PERF547_SHAPE.threads, "every thread of the document is a highlight");

    // A few words of the last text node of a paragraph that no thread marks.
    await page.evaluate(() => {
      const paragraph = [...document.querySelectorAll("#sphinx-myst-preview-content p")]
        .filter((candidate) => !candidate.closest("table, blockquote, li, [data-okf-properties]")
          && (candidate.textContent ?? "").length > 200)[1]!;
      const text = [...paragraph.childNodes].filter((node) => node.nodeType === 3 && node.textContent!.trim() !== "").pop()!;
      paragraph.scrollIntoView({ block: "center", behavior: "instant" });
      const range = document.createRange();
      range.setStart(text, 10);
      range.setEnd(text, 29);
      window.getSelection()!.removeAllRanges();
      window.getSelection()!.addRange(range);
    });
    await page.click("[data-okf-comment-create]", { timeout: TIMEOUT_MS });
    await page.fill("[data-okf-comment-compose-input]", "Lorem ipsum review comment.");
    await atRest(page);

    await browser.startTracing(page, {
      categories: ["devtools.timeline", "disabled-by-default-devtools.timeline", "blink.user_timing"],
    });
    let trace: Buffer;
    try {
      await page.evaluate(() => { performance.mark("restyle:start"); });
      await page.click("[data-okf-comment-compose-save]");
      const posted = await page.waitForFunction(() => (window as unknown as { __posted: Array<{ type: string }> }).__posted
        .find((message) => message.type === "previewCommentCreate"), undefined, { timeout: TIMEOUT_MS });
      const created = await posted.jsonValue() as unknown as { anchor: CommentThread["anchor"]; body: string };
      const createdAt = "2026-11-26T10:00:00.000Z";
      await send({ type: "previewCommentResult", ok: true, kind: "create", threadId: NEW_THREAD });
      await send({
        type: "previewComments",
        threads: [...threads, {
          id: NEW_THREAD, anchor: created.anchor, resolved: false, createdAt,
          comments: [{ id: "c_0000000f", author: "Ada", createdAt, body: created.body }],
        }].map((thread) => ({ ...thread, orphaned: false })),
      });
      await page.waitForFunction((id) => document.querySelector(`mark[data-okf-comment-thread="${id}"]`) !== null
        && document.querySelector("[data-okf-comment-compose]") === null, NEW_THREAD, { timeout: TIMEOUT_MS });
      await atRest(page);
      await page.evaluate(() => { performance.mark("restyle:end"); });
    } finally {
      trace = await browser.stopTracing();
    }
    assert.equal(await highlights(), PERF547_SHAPE.threads + 1, "the new comment is a highlight");
    const passes = restyledBetween(trace, "restyle:start", "restyle:end");
    const total = passes.reduce((sum, count) => sum + count, 0);
    const elements = await page.evaluate(() => document.getElementsByTagName("*").length);
    t.diagnostic(`restyled ${total} elements in ${passes.length} style passes (largest ${Math.max(0, ...passes)}); `
      + `the page has ${elements} elements`);
    assert.ok(total > 0, "the trace counts the style passes of the creation");
    assert.ok(total <= RESTYLE_LIMIT,
      `one comment creation restyled ${total} elements, more than ${RESTYLE_LIMIT} (passes: ${passes.join(", ")})`);
  } finally {
    await browser.close();
  }
});
