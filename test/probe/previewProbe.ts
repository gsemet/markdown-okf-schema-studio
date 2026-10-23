/**
 * Windowless preview performance probe (`npm run probe`).
 *
 * Builds the preview page of a large chapter with the extension's own page builder
 * (`buildPreviewWebviewHtml`: Content-Security-Policy, nonce, runtime, stylesheets), opens it in
 * headless Chromium with a stand-in for the VS Code webview API, and plays the messages the
 * extension host sends: ten content patches (ten characters typed at the end of the chapter, each
 * rendered by the real pipeline and planned by the real `planContentPatch`), a theme change, and a
 * re-render patch of an unchanged buffer. It reports:
 *
 * - scroll frames: script time of each animation frame while scrolling (mean, p95, max) and the
 *   geometry reads, `setState` calls and host messages per frame;
 * - typing: page loads (navigations) and Mermaid diagrams drawn again across the ten patches, and
 *   the time spent applying them;
 * - inline editor: whether an open block editor survives a theme change, the Mermaid redraw it
 *   causes, and a re-render patch of the same buffer.
 *
 * Counting `webview.html` assignments needs the extension host: the real-window probe
 * (`STUDIO_REAL_INPUT_SCENARIO=probe npm run test:integration -- --trusted-only`) reports them.
 * The result is written to out/reports/probe/preview-probe.json. Exit code 0 unless the probe
 * itself fails; with `--check` it also fails when an exit criterion is missed.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

import { chromium, type Page } from "playwright-core";

import { analyzeFrontmatter } from "../../src/frontmatter/okfFrontmatter";
import { sourceRangeForLines } from "../../src/mapping/sourceMapping";
import { planContentPatch } from "../../src/preview/contentPatch";
import { renderPreviewDocument } from "../../src/render/renderPipeline";
import type { buildPreviewWebviewHtml as BuildPreviewWebviewHtml } from "../../src/preview/webview";
import { REPORTS_ROOT, EXTENSION_ROOT } from "../reportPaths";
import { frameStats, installFrameProbe, rebuiltBlocks, snapshotBlocks, type FrameSample } from "./frameProbe";
import { PROBE_EDIT_PARAGRAPH, PROBE_MERMAID_COUNT, probeChapter } from "./largeChapter";

// src/preview/webview.ts imports "vscode"; the probe supplies the members the page builder uses.
interface FakeUri {
  fsPath: string;
  toString(): string;
}
const fakeUri = (fsPath: string): FakeUri => ({ fsPath, toString: () => pathToFileURL(fsPath).href });
// eslint-disable-next-line @typescript-eslint/no-require-imports
const nodeModule = require("node:module") as { _load: (request: string, ...rest: unknown[]) => unknown };
const originalLoad = nodeModule._load;
nodeModule._load = function load(request: string, ...rest: unknown[]): unknown {
  if (request === "vscode") {
    return {
      Uri: {
        file: fakeUri,
        joinPath: (base: FakeUri, ...parts: string[]) => fakeUri(path.join(base.fsPath, ...parts)),
      },
    };
  }
  return originalLoad.call(this, request, ...rest);
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const webviewModule = require("../../src/preview/webview") as {
  buildPreviewWebviewHtml: typeof BuildPreviewWebviewHtml;
  setPreviewStatus: typeof import("../../src/preview/webview").setPreviewStatus;
  PREVIEW_STATUS_LABELS: typeof import("../../src/preview/webview").PREVIEW_STATUS_LABELS;
};
nodeModule._load = originalLoad;

const PROBE_ROOT = path.join(REPORTS_ROOT, "probe");
const SOURCE_PATH = path.join(PROBE_ROOT, "large-chapter.md");
const SCROLL_STEPS = 120;
const SCROLL_STEP_PX = 160;
const TYPED = "abcdefghij";
const SLOW_CPU_RATE = 4;
/** Exit criterion of the scroll frame (script time, ms). */
export const SCROLL_FRAME_BUDGET_MS = 4;

const webview = {
  cspSource: "file:",
  asWebviewUri: (uri: FakeUri) => fakeUri(uri.fsPath),
};

interface BuiltPage {
  html: string;
  documentId: string;
  version: number;
  requestId: number;
}

/**
 * The page as VS Code's webview loader shows it (`toContentHtml` in the webview's `pre/index.html`):
 * every link without a title gets its `href` as title. Only the first page goes through the
 * loader; content patches reach the page by message, as they are.
 */
export function asLoadedByVsCode(html: string): string {
  return html.replace(/<a(\s[^>]*)?>/gu, (tag: string, attributes: string | undefined) => {
    if (!attributes || /\stitle\s*=/u.test(attributes)) return tag;
    const href = /\shref="([^"]*)"/u.exec(attributes);
    return href ? `<a${attributes} title="${href[1]}">` : tag;
  });
}

async function buildPage(text: string, version: number, requestId: number): Promise<BuiltPage> {
  const result = await renderPreviewDocument({
    document: { uri: { scheme: "file", fsPath: SOURCE_PATH }, languageId: "markdown", version, getText: () => text },
    workspaceRoot: EXTENSION_ROOT,
    requestId,
    isWorkspaceTrusted: () => true,
    plantUmlEngine: "builtin",
  });
  const frontmatter = analyzeFrontmatter({
    filePath: SOURCE_PATH,
    sourceText: text,
    stopDir: EXTENSION_ROOT,
    allowSchemaResolution: true,
    inspectLinks: false,
    strictAdditionalProperties: false,
  });
  const built = webviewModule.buildPreviewWebviewHtml(
    result.html,
    result.stage.outputDirectory,
    webview as never,
    {
      documentId: result.stage.activeDocumentIdentity,
      documentVersion: version,
      requestId,
      activeSourceFile: result.stage.activeDocumentPath,
      stickyHeadingDepth: 3,
      pairedTextEditor: true,
      initialEditMode: false,
      commentsEnabled: true,
    },
    EXTENSION_ROOT,
    frontmatter.present ? { result: frontmatter, tableEnabled: true } : undefined,
    undefined,
    fakeUri(EXTENSION_ROOT) as never,
    true,
    true,
    [],
    "builtin",
  );
  result.stage.dispose();
  return {
    html: webviewModule.setPreviewStatus(built.html, "success", undefined, []),
    documentId: result.stage.activeDocumentIdentity,
    version,
    requestId,
  };
}

/** Stand-in for the VS Code webview API, installed before the page's scripts run. */
function installHostStub(): void {
  const scope = window as unknown as Record<string, unknown>;
  const probe = scope.__studioProbe as { setStates: number; posts: number };
  const posted: unknown[] = [];
  scope.__probePosted = posted;
  let state: unknown;
  scope.acquireVsCodeApi = () => ({
    getState: () => state,
    setState: (next: unknown) => {
      probe.setStates += 1;
      state = next;
    },
    postMessage: (message: { type?: string }) => {
      probe.posts += 1;
      posted.push(message);
      if (message.type === "previewEditOpen") {
        void (scope.__probeHost as (value: unknown) => Promise<unknown>)(message).then((reply) => {
          if (reply) window.dispatchEvent(new MessageEvent("message", { data: reply }));
        });
      }
    },
  });
}

async function frames(page: Page, action: () => Promise<void>): Promise<FrameSample[]> {
  await page.evaluate(() => {
    const probe = (window as unknown as { __studioProbe: { recording: boolean; frames: Map<number, unknown> } }).__studioProbe;
    probe.frames.clear();
    probe.recording = true;
  });
  await action();
  return page.evaluate(() => {
    const probe = (window as unknown as { __studioProbe: { recording: boolean; frames: Map<number, FrameSample> } }).__studioProbe;
    probe.recording = false;
    return [...probe.frames.values()];
  });
}

/** Scrolls the page down in steps, one step per two animation frames (unwrapped). */
async function scrollThrough(page: Page): Promise<void> {
  await page.evaluate(async ({ steps, step }) => {
    const raf = (window as unknown as { __studioProbe: { raf: (callback: FrameRequestCallback) => number } }).__studioProbe.raf;
    const nextFrame = (): Promise<void> => new Promise((resolve) => raf(() => resolve()));
    for (let index = 0; index < steps; index += 1) {
      window.scrollBy(0, step);
      await nextFrame();
      await nextFrame();
    }
  }, { steps: SCROLL_STEPS, step: SCROLL_STEP_PX });
}

async function probeCounters(page: Page): Promise<{ mermaidDrawn: number; messageMs: number; messages: number }> {
  return page.evaluate(() => {
    const probe = (window as unknown as { __studioProbe: { mermaidDrawn: number; messageMs: number; messages: number } }).__studioProbe;
    return { mermaidDrawn: probe.mermaidDrawn, messageMs: probe.messageMs, messages: probe.messages };
  });
}

async function waitForReady(page: Page, requestId: number): Promise<void> {
  await page.waitForFunction((id) => ((window as unknown as { __probePosted: { type: string; requestId: number }[] }).__probePosted)
    .some((message) => message.type === "previewReady" && message.requestId === id), requestId);
}

/** Waits until every Mermaid diagram is drawn and no new drawing happened for a few frames. */
async function waitForMermaidSettled(page: Page): Promise<void> {
  await page.waitForFunction((count) => document.querySelectorAll(".myst-mermaid-diagram img.myst-mermaid-image").length === count,
    PROBE_MERMAID_COUNT);
  await page.evaluate(async () => {
    const probe = (window as unknown as { __studioProbe: { mermaidDrawn: number; raf: (callback: FrameRequestCallback) => number } }).__studioProbe;
    const nextFrame = (): Promise<void> => new Promise((resolve) => probe.raf(() => resolve()));
    let last = probe.mermaidDrawn;
    let quiet = 0;
    while (quiet < 20) {
      await nextFrame();
      if (probe.mermaidDrawn === last) quiet += 1;
      else {
        last = probe.mermaidDrawn;
        quiet = 0;
      }
    }
  });
}

async function postToPage(page: Page, message: unknown): Promise<void> {
  await page.evaluate((data) => window.dispatchEvent(new MessageEvent("message", { data })), message);
}

function contentPatchMessage(previous: BuiltPage, next: BuiltPage): unknown {
  const patch = planContentPatch(previous.html, next.html);
  if (!patch) throw new Error(`render ${next.requestId} cannot be applied as a content patch`);
  return {
    type: "previewContentPatch",
    documentId: previous.documentId,
    documentVersion: previous.version,
    requestId: previous.requestId,
    next: { documentVersion: next.version, requestId: next.requestId },
    contentHtml: patch.contentHtml,
    status: "success",
    label: webviewModule.PREVIEW_STATUS_LABELS.success,
    diagnostics: [],
  };
}

interface EditorProbe {
  open: boolean;
  survivesThemeChange: boolean;
  diagramsRedrawn: number;
  survivesDiagramCompletion: boolean;
  /**
   * Informative: a content patch posted straight to the page while the editor is open. The host
   * no longer sends one then (it waits for the editor to close, STAB-03), so false is expected.
   */
  undeferredPatchKeepsEditor: boolean;
}

async function editorAlive(page: Page, typed: string): Promise<boolean> {
  return page.evaluate((text) => {
    const editor = (window as unknown as { __probeEditor?: HTMLTextAreaElement }).__probeEditor;
    return editor !== undefined && editor.isConnected && editor.value.includes(text)
      && document.querySelectorAll("[data-sphinx-preview-block-editor] textarea").length === 1;
  }, typed);
}

async function probeEditor(page: Page, current: BuiltPage, rebuild: (requestId: number) => Promise<BuiltPage>): Promise<EditorProbe> {
  const result: EditorProbe = { open: false, survivesThemeChange: false, diagramsRedrawn: 0, survivesDiagramCompletion: false, undeferredPatchKeepsEditor: false };
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator("[data-sphinx-preview-edit-toggle]").click();
  await page.waitForFunction(() => document.documentElement.getAttribute("data-sphinx-preview-edit-mode") === "on");
  const paragraph = page.locator("p", { hasText: PROBE_EDIT_PARAGRAPH }).first();
  await paragraph.scrollIntoViewIfNeeded();
  await paragraph.click();
  const textarea = page.locator("[data-sphinx-preview-block-editor] textarea");
  await textarea.waitFor({ state: "visible" });
  await textarea.press("End");
  await page.keyboard.type(" Z");
  await page.evaluate(() => {
    (window as unknown as { __probeEditor?: Element }).__probeEditor = document.querySelector("[data-sphinx-preview-block-editor] textarea") ?? undefined;
  });
  result.open = await editorAlive(page, "Z");
  if (!result.open) return result;

  // Theme change: VS Code sets the new theme's colours on the page and the host posts themeChanged;
  // the page redraws every Mermaid diagram with the new colours.
  const drawnBefore = (await probeCounters(page)).mermaidDrawn;
  await page.evaluate(() => {
    // On the body: a forced theme mode of the page sets these variables on html and body itself.
    document.body.style.setProperty("--vscode-editor-foreground", "#e0e0e0");
    document.body.style.setProperty("--vscode-editor-background", "#1e1e1e");
  });
  await postToPage(page, {
    type: "themeChanged",
    themeKind: 2,
    documentId: current.documentId,
    documentVersion: current.version,
    requestId: current.requestId,
  });
  result.survivesThemeChange = await editorAlive(page, "Z");
  await page.waitForFunction(({ before, count }) =>
    (window as unknown as { __studioProbe: { mermaidDrawn: number } }).__studioProbe.mermaidDrawn >= before + count,
  { before: drawnBefore, count: PROBE_MERMAID_COUNT }, { timeout: 15_000 }).catch(() => undefined);
  result.diagramsRedrawn = (await probeCounters(page)).mermaidDrawn - drawnBefore;
  result.survivesDiagramCompletion = result.diagramsRedrawn >= PROBE_MERMAID_COUNT && await editorAlive(page, "Z");

  // A re-render of the same buffer delivered as a content patch (what a theme change, a settings
  // change or a dependency change rendered before this change request).
  const next = await rebuild(current.requestId + 1);
  await postToPage(page, contentPatchMessage(current, next));
  await waitForReady(page, next.requestId);
  result.undeferredPatchKeepsEditor = await editorAlive(page, "Z");
  return result;
}

async function main(): Promise<void> {
  const check = process.argv.includes("--check");
  fs.mkdirSync(PROBE_ROOT, { recursive: true });
  const source = probeChapter();
  fs.writeFileSync(SOURCE_PATH, source, "utf8");
  let requestId = 1;
  let version = 1;
  let text = source;
  let current = await buildPage(text, version, requestId);
  const pagePath = path.join(PROBE_ROOT, "page.html");
  fs.writeFileSync(pagePath, asLoadedByVsCode(current.html), "utf8");

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1000, height: 900 }, deviceScaleFactor: 1 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.exposeFunction("__probeHost", (message: { type: string; line: number; endLine: number } & Record<string, unknown>) => {
      if (message.type !== "previewEditOpen") return undefined;
      const range = sourceRangeForLines(text, Number(message.line), Number(message.endLine));
      return { ...message, type: "previewEditSource", originalText: range ? text.slice(range.start, range.end) : "" };
    });
    await page.addInitScript(installFrameProbe);
    await page.addInitScript(installHostStub);
    let navigations = 0;
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) navigations += 1;
    });
    await page.goto(pathToFileURL(pagePath).href);
    await waitForReady(page, requestId);
    await waitForMermaidSettled(page);
    const loads = navigations;
    const runtime = await page.evaluate(() => ({
      htmlBytes: document.documentElement.outerHTML.length,
      inlineScriptBytes: Array.from(document.querySelectorAll("script:not([src])"))
        .reduce((total, script) => total + (script.textContent ?? "").length, 0),
      inlineStyleBytes: Array.from(document.querySelectorAll("style"))
        .reduce((total, style) => total + (style.textContent ?? "").length, 0),
      externalScripts: Array.from(document.querySelectorAll("script[src]"))
        .map((script) => (script.getAttribute("src") ?? "").replace(/^.*\//u, "")),
    }));
    const pageBytes = { ...runtime, hostHtmlBytes: current.html.length };

    // Scroll frames over the whole chapter.
    const scrollSamples = await frames(page, () => scrollThrough(page));
    const scroll = frameStats(scrollSamples);
    await page.evaluate(() => window.scrollTo(0, 0));
    // The same scroll on a CPU slowed down four times (a slower machine, a busy window).
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: SLOW_CPU_RATE });
    const slowSamples = await frames(page, () => scrollThrough(page));
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    await cdp.detach();
    const scrollSlowCpu = { cpuSlowdown: SLOW_CPU_RATE, ...frameStats(slowSamples) };
    await page.evaluate(() => window.scrollTo(0, 0));

    // Ten characters typed at the end of the chapter: ten renders applied as content patches.
    const before = await probeCounters(page);
    await page.evaluate(snapshotBlocks);
    const patchStarted = Date.now();
    for (const character of TYPED) {
      text = text.replace(/The last paragraph\.[^\n]*/u, (line) => line + character);
      version += 1;
      requestId += 1;
      const next = await buildPage(text, version, requestId);
      await postToPage(page, contentPatchMessage(current, next));
      await waitForReady(page, next.requestId);
      current = next;
    }
    await waitForMermaidSettled(page);
    const after = await probeCounters(page);
    const rebuilt = await page.evaluate(rebuiltBlocks);
    const typing = {
      characters: TYPED.length,
      pageLoads: navigations - loads,
      mermaidDrawn: after.mermaidDrawn - before.mermaidDrawn,
      patchApplyMs: Math.round((after.messageMs - before.messageMs) * 1000) / 1000,
      wallMs: Date.now() - patchStarted,
      typedTextShown: await page.locator("#sphinx-myst-preview-content").innerText().then((shown) => shown.includes("The last paragraph." + TYPED)),
      blocks: rebuilt.blocks,
      blocksRebuilt: rebuilt.rebuilt,
      firstUnexpectedDifference: rebuilt.firstDifference,
    };

    const editor = await probeEditor(page, current, (id) => buildPage(text, version, id));
    const report = {
      generatedAt: new Date().toISOString(),
      fixture: { bytes: source.length, lines: source.split("\n").length, mermaid: PROBE_MERMAID_COUNT },
      page: pageBytes,
      scroll,
      scrollSlowCpu,
      typing,
      editor,
      // Mermaid measures text with temporary inline styles, which the strict policy refuses (as in
      // VS Code); those reports are counted, every other page error is listed.
      cspStyleReports: errors.filter((error) => /Applying inline style violates/u.test(error)).length,
      errors: [...new Set(errors.filter((error) => !/Applying inline style violates/u.test(error)))],
      criteria: {
        // The budget holds on a four times slower CPU too (the exit criterion of CR 051).
        scrollFrameUnderBudget: scroll.p95Ms < SCROLL_FRAME_BUDGET_MS && scrollSlowCpu.p95Ms < SCROLL_FRAME_BUDGET_MS,
        noPageLoadWhileTyping: typing.pageLoads === 0,
        noMermaidWorkForEditOutsideDiagrams: typing.mermaidDrawn === 0,
        // Only the typed paragraph is a new node; the first page went through VS Code's loader.
        onlyTypedBlockRebuilt: typing.blocksRebuilt === 1,
        editorSurvivesThemeChange: editor.survivesThemeChange,
        editorSurvivesDiagramCompletion: editor.survivesDiagramCompletion,
      },
    };
    fs.writeFileSync(path.join(PROBE_ROOT, "preview-probe.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(JSON.stringify(report, null, 2));
    if (check && Object.values(report.criteria).some((value) => !value)) {
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
