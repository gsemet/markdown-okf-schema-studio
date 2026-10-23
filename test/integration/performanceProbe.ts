/**
 * Real-window preview performance probe:
 * `STUDIO_REAL_INPUT_SCENARIO=probe npm run test:integration -- --trusted-only`.
 *
 * Opens the large chapter of the windowless probe (test/probe/largeChapter.ts) in a real VS Code
 * window and reports, on the extension host and in the webview:
 *
 * - typing: `webview.html` assignments, content patches and page reloads while ten characters are
 *   typed in the text editor;
 * - scroll frames: script time of each animation frame of the webview while scrolling (normal and
 *   four times slower CPU);
 * - inline editor: whether an open block editor (with text typed after its first autosave)
 *   survives a save of the document, a color theme change and the Mermaid redraw it causes.
 *
 * It writes out/reports/probe/window-probe.json and prints the same JSON. It measures; it asserts
 * only what it needs to run (the preview renders, the editor opens).
 */

import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import type { Frame, Page } from "playwright-core";
import * as vscode from "vscode";

import { getActivePreviewForTests } from "./extensionApi";
import {
  closeAllEditors,
  createFixture,
  currentPreviewFrame,
  htmlAssignmentCount,
  openSidePreview,
  setEditMode,
  typeText,
  waitFor,
  waitForEditor,
  waitForRender,
} from "./realInput/harness";
import { frameStats, installFrameProbe, type FrameSample } from "../probe/frameProbe";
import { PROBE_EDIT_PARAGRAPH, PROBE_MERMAID_COUNT, probeChapter } from "../probe/largeChapter";
import { REPORTS_ROOT } from "../reportPaths";

const TYPED = "abcdefghij";
const SCROLL_STEPS = 120;
const SCROLL_STEP_PX = 160;
const SLOW_CPU_RATE = 4;
const EDITOR = "[data-sphinx-preview-block-editor] textarea";

function contentPatchCount(): number {
  return getActivePreviewForTests()?.contentPatches ?? 0;
}

/** Waits until the host has no deferred page work and has rendered nothing new for 800 ms. */
async function settle(): Promise<void> {
  let last = "";
  let since = Date.now();
  await waitFor("the preview to settle", () => {
    const preview = getActivePreviewForTests();
    const now = JSON.stringify([preview?.htmlAssignments, preview?.contentPatches, preview?.renderedStages,
      preview?.phase, preview?.deferredWorkPending]);
    if (now !== last) {
      last = now;
      since = Date.now();
    }
    return preview?.phase === "ready" && preview.deferredWorkPending === false && Date.now() - since >= 800;
  }, 30_000);
}

async function framesWhile(frame: Frame, action: () => Promise<void>): Promise<FrameSample[]> {
  await frame.evaluate(() => {
    const probe = (window as unknown as { __studioProbe: { recording: boolean; frames: Map<number, unknown> } }).__studioProbe;
    probe.frames.clear();
    probe.recording = true;
  });
  await action();
  return frame.evaluate(() => {
    const probe = (window as unknown as { __studioProbe: { recording: boolean; frames: Map<number, FrameSample> } }).__studioProbe;
    probe.recording = false;
    return [...probe.frames.values()];
  });
}

async function scrollThrough(frame: Frame): Promise<void> {
  await frame.evaluate(async ({ steps, step }) => {
    const raf = (window as unknown as { __studioProbe: { raf: (callback: FrameRequestCallback) => number } }).__studioProbe.raf;
    const nextFrame = (): Promise<void> => new Promise((resolve) => raf(() => resolve()));
    window.scrollTo(0, 0);
    await nextFrame();
    for (let index = 0; index < steps; index += 1) {
      window.scrollBy(0, step);
      await nextFrame();
      await nextFrame();
    }
  }, { steps: SCROLL_STEPS, step: SCROLL_STEP_PX });
}

async function editorAlive(frame: Frame): Promise<boolean> {
  try {
    return await frame.evaluate(() => {
      const editor = (window as unknown as { __probeEditor?: HTMLTextAreaElement }).__probeEditor;
      return editor !== undefined && editor.isConnected && editor.value.includes(" Z")
        && document.querySelectorAll("[data-sphinx-preview-block-editor] textarea").length === 1;
    });
  } catch {
    return false; // the frame was replaced: the page reloaded
  }
}

async function mermaidDrawn(frame: Frame): Promise<number> {
  try {
    return await frame.evaluate(() =>
      (window as unknown as { __studioProbe: { mermaidDrawn: number } }).__studioProbe.mermaidDrawn);
  } catch {
    return -1;
  }
}

export async function scenarioPerformanceProbe(page: Page): Promise<void> {
  const fixture = createFixture("perf-probe", { "chapter.md": probeChapter() });
  const themeSetting = vscode.workspace.getConfiguration("workbench");
  const originalTheme = themeSetting.inspect<string>("colorTheme")?.globalValue;
  try {
    const source = await vscode.workspace.openTextDocument(vscode.Uri.file(fixture.path("chapter.md")));
    await openSidePreview(source);
    await waitForRender(source);
    let frame = await currentPreviewFrame(page);
    await waitFor("the Mermaid diagrams", async () =>
      await frame.locator(".myst-mermaid-diagram img.myst-mermaid-image").count() === PROBE_MERMAID_COUNT, 60_000);
    await settle();
    frame = await currentPreviewFrame(page);
    await frame.evaluate(installFrameProbe);

    // Typing ten characters at the end of the chapter.
    const editor = await vscode.window.showTextDocument(source, vscode.ViewColumn.One);
    const end = source.positionAt(source.getText().length);
    editor.selection = new vscode.Selection(end, end);
    await waitFor("the caret at the end", () => vscode.window.activeTextEditor?.selection.active.isEqual(end) === true);
    const assignments0 = htmlAssignmentCount();
    const patches0 = contentPatchCount();
    const drawn0 = await mermaidDrawn(frame);
    await typeText(page, TYPED, 60);
    await waitForRender(source);
    await settle();
    const typing = {
      characters: TYPED.length,
      htmlAssignments: htmlAssignmentCount() - assignments0,
      contentPatches: contentPatchCount() - patches0,
      pageReloads: frame.isDetached() ? 1 : 0,
      mermaidDrawn: frame.isDetached() ? -1 : await mermaidDrawn(frame) - drawn0,
    };

    // Scroll frames.
    frame = await currentPreviewFrame(page);
    await frame.evaluate(installFrameProbe);
    const scroll = frameStats(await framesWhile(frame, () => scrollThrough(frame)));
    // The webview frames share the window's renderer session: throttle the CPU through the page.
    const cdp = await page.context().newCDPSession(page);
    let scrollSlowCpu: ReturnType<typeof frameStats> & { cpuSlowdown: number };
    try {
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: SLOW_CPU_RATE });
      scrollSlowCpu = { cpuSlowdown: SLOW_CPU_RATE, ...frameStats(await framesWhile(frame, () => scrollThrough(frame))) };
    } finally {
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 }).catch(() => undefined);
      await cdp.detach().catch(() => undefined);
    }

    // An inline editor with text typed after its first autosave.
    await settle();
    frame = await setEditMode(page, true);
    await frame.evaluate(() => window.scrollTo(0, 0));
    const paragraph = frame.locator("p", { hasText: PROBE_EDIT_PARAGRAPH }).first();
    await paragraph.scrollIntoViewIfNeeded();
    await paragraph.click();
    frame = await waitForEditor(page, EDITOR);
    await frame.locator(EDITOR).press("End");
    await typeText(page, " Z", 30);
    await frame.evaluate((selector) => {
      (window as unknown as { __probeEditor?: Element }).__probeEditor = document.querySelector(selector) ?? undefined;
    }, EDITOR);
    await waitFor("the first autosave of the block", () => source.getText().includes(PROBE_EDIT_PARAGRAPH + " Z"), 15_000);
    await typeText(page, "Y", 30);
    const open = await editorAlive(frame);
    assert.ok(open, "the inline editor is open before the probe");

    await source.save();
    await settle();
    const survivesSave = await editorAlive(frame);

    const drawnBeforeTheme = await mermaidDrawn(frame);
    const currentKind = vscode.window.activeColorTheme.kind;
    const nextTheme = currentKind === vscode.ColorThemeKind.Light ? "Default Dark Modern" : "Default Light Modern";
    const themeBefore = await frame.evaluate(() => document.documentElement.getAttribute("data-sphinx-preview-theme"))
      .catch(() => null);
    await themeSetting.update("colorTheme", nextTheme, vscode.ConfigurationTarget.Global);
    await waitFor("the theme change in the page", async () => {
      if (frame.isDetached()) return true;
      return await frame.evaluate(() => document.documentElement.getAttribute("data-sphinx-preview-theme"))
        .catch(() => "gone") !== themeBefore;
    }, 15_000);
    await settle();
    const survivesThemeChange = await editorAlive(frame);
    await waitFor("the Mermaid redraw after the theme change", async () =>
      frame.isDetached() || await mermaidDrawn(frame) >= drawnBeforeTheme + PROBE_MERMAID_COUNT, 30_000).catch(() => undefined);
    const diagramsRedrawn = !frame.isDetached() && await mermaidDrawn(frame) >= drawnBeforeTheme + PROBE_MERMAID_COUNT;
    const survivesDiagramCompletion = diagramsRedrawn && await editorAlive(frame);
    const editorReport = {
      open,
      survivesSave,
      survivesThemeChange,
      diagramsRedrawn,
      survivesDiagramCompletion,
      typedAfterAutosaveKept: survivesDiagramCompletion
        && await frame.evaluate((selector) => (document.querySelector(selector) as HTMLTextAreaElement | null)?.value.includes(" ZY") ?? false, EDITOR),
    };

    const report = {
      generatedAt: new Date().toISOString(),
      vscode: vscode.version,
      fixture: { bytes: source.getText().length, lines: source.lineCount, mermaid: PROBE_MERMAID_COUNT },
      typing,
      scroll,
      scrollSlowCpu,
      editor: editorReport,
    };
    const directory = path.join(REPORTS_ROOT, "probe");
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, "window-probe.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log("PROBE " + JSON.stringify(report, null, 2));
  } finally {
    await setEditMode(page, false).then(undefined, () => undefined);
    await themeSetting.update("colorTheme", originalTheme, vscode.ConfigurationTarget.Global).then(undefined, () => undefined);
    await closeAllEditors();
    fixture.dispose();
  }
}
