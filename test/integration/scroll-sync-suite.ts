import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { execFileSync } from "node:child_process";
import { chromium, type Frame, type Locator, type Page } from "playwright-core";
import * as vscode from "vscode";

import { disposeActivePreviewForTests, getActivePreviewForTests, getActivePreviewPanelForTests } from "./extensionApi";
import { captureByLegacy, captureFile } from "../shared/captureRegistry";
import { RealWindowEvidence } from "./evidence";
import { pinStoredWorkspaceChoices } from "./storedChoices";
import { ensureTestWindowFocused } from "./windowFocus";

async function waitFor(description: string, predicate: () => boolean | Promise<boolean>): Promise<void> {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out waiting for ${description}.`);
}

async function settle(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 700));
}

async function previewFrame(page: Page): Promise<Frame> {
  let result: Frame | undefined;
  await waitFor("the rendered Studio webview", async () => {
    for (const frame of page.frames()) {
      try {
        if (await frame.locator("#sphinx-myst-preview-content").isVisible()) {
          let visible = true;
          for (let ancestor: Frame | null = frame; ancestor?.parentFrame(); ancestor = ancestor.parentFrame()) {
            if (!await (await ancestor.frameElement()).isVisible()) {
              visible = false;
              break;
            }
          }
          if (!visible) continue;
          result = frame;
          return true;
        }
      } catch {
        // A custom editor rerender can detach the previous webview during polling.
      }
    }
    return false;
  });
  assert.ok(result);
  return result;
}

interface BlockEditorHandle {
  readonly frame: Frame;
  readonly textarea: Locator;
  readonly value: string;
}

async function waitForBlockEditor(
  page: Page,
  description: string,
  matches: (value: string) => boolean | Promise<boolean>,
): Promise<BlockEditorHandle> {
  let result: BlockEditorHandle | undefined;
  await waitFor(description, async () => {
    try {
      const frame = await previewFrame(page);
      const textarea = frame.locator("[data-sphinx-preview-block-editor] textarea");
      if (await textarea.count() !== 1) return false;
      const value = await textarea.inputValue();
      if (!await matches(value)) return false;
      result = { frame, textarea, value };
      return true;
    } catch {
      return false;
    }
  });
  assert.ok(result);
  return result;
}

async function sourceMonaco(page: Page): Promise<Locator> {
  const editors = vscode.window.visibleTextEditors.filter((editor) =>
    path.basename(editor.document.uri.fsPath) === "long-scroll.md");
  assert.equal(editors.length, 1, "exactly one visible source editor targets the fixture");
  const editor = page.locator(".editor-group-container").filter({
    has: page.locator('[data-resource-name="long-scroll.md"]'),
  }).locator(".editor-instance .monaco-editor").filter({ visible: true });
  assert.equal(await editor.count(), 1, "exactly one visible Monaco belongs to the fixture group");
  return editor;
}

async function scrollPane(page: Page, frame: Frame, pane: "preview" | "source", down: boolean): Promise<void> {
  const target = pane === "preview"
    ? await frame.frameElement()
    : await sourceMonaco(page);
  const bounds = await target.boundingBox();
  assert.ok(bounds, `${pane} pane is visible`);
  const pointer = { x: bounds.x + bounds.width / 2, y: bounds.y + Math.min(200, bounds.height / 2) };
  await page.mouse.move(pointer.x, pointer.y);
  if (pane === "source") {
    await page.mouse.wheel(0, down ? 12_000 : -12_000);
  } else {
    await page.mouse.wheel(0, down ? 1_000_000 : -1_000_000);
  }
}

async function dragSourceScrollbar(page: Page, down: boolean): Promise<void> {
  const scrollbar = (await sourceMonaco(page)).locator(".scrollbar.vertical").filter({ visible: true });
    const track = await scrollbar.boundingBox();
    const thumb = await scrollbar.locator(".slider").boundingBox();
    assert.ok(track && thumb, "the source scrollbar is available");
    await page.mouse.move(thumb.x + thumb.width / 2, thumb.y + thumb.height / 2);
    await page.mouse.down();
    await page.mouse.move(track.x + track.width / 2, down ? track.y + track.height - 1 : track.y + 1,
      { steps: 4 });
    await page.mouse.up();
}

async function runBlockMove(page: Page, directory: string): Promise<void> {
  const filePath = path.join(directory, "block-move.md");
  const sentence = "A sentence long enough to wrap in the preview pane and give the block some height. ";
  const paragraphs = Array.from({ length: 40 }, (_, index) =>
    `Paragraph ${index + 1}: ${sentence.repeat((index % 3) + 1)}`);
  fs.writeFileSync(filePath, `# Block move\n\n${paragraphs.join("\n\n")}\n`);
  await vscode.commands.executeCommand("workbench.action.closeAllEditors");
  await vscode.commands.executeCommand("workbench.action.joinAllGroups");
  const document = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
  await vscode.commands.executeCommand(
    "vscode.openWith", document.uri, "markdown-okf-schema-studio.editor", vscode.ViewColumn.One,
  );
  await waitFor("the block-move preview", () => getActivePreviewForTests()?.phase === "ready");
  let frame = await previewFrame(page);
  const editButton = frame.locator("[data-sphinx-preview-edit-toggle]");
  if (await editButton.getAttribute("aria-pressed") !== "true") await editButton.click();
  const paragraph = (number: number) => frame.locator(`p:has-text("Paragraph ${number}:")`);
  await paragraph(20).scrollIntoViewIfNeeded();
  await frame.evaluate(() => window.scrollBy(0, 150));
  await settle();
  const topOf = async (number: number): Promise<number> => {
    frame = await previewFrame(page);
    return paragraph(number).evaluate((element) => element.getBoundingClientRect().top);
  };
  const orderOf = (first: number, second: number): boolean => {
    const text = document.getText();
    return text.indexOf(`Paragraph ${first}:`) < text.indexOf(`Paragraph ${second}:`);
  };
  let before = await topOf(20);
  assert.ok(before > 0, "paragraph 20 is in the viewport");
  // Two clicks in a row on the bar under the moved block: the block stays under the pointer.
  for (const passed of [21, 22]) {
    const button = frame.locator(
      `p:has-text("Paragraph 20:") + .sphinx-preview-insert-point button[data-sphinx-move="down"]`);
    await button.click();
    await waitFor(`paragraph 20 moved below paragraph ${passed}`, () => orderOf(passed, 20));
    await settle();
    const after = await topOf(20);
    assert.ok(Math.abs(after - before) <= 3, `the moved block jumped from ${before} to ${after}`);
    before = after;
  }
  assert.equal(document.getText().split("\n\n").length, paragraphs.length + 1, "no block was lost or merged");
  await vscode.commands.executeCommand("workbench.action.focusActiveEditorGroup");
  await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
  await vscode.commands.executeCommand("undo");
  assert.ok(orderOf(21, 20) && !orderOf(22, 20), "one undo restores one move");
}

async function runBlockNavigation(
  page: Page, directory: string,
  capture: (frame: Frame, document: vscode.TextDocument, value: string) => Promise<void>,
): Promise<void> {
  const filePath = path.join(directory, "keyboard-navigation.md");
  const source = [
    "# Keyboard navigation",
    "",
    "First paragraph line one.",
    "First paragraph line two.",
    "",
    "Second paragraph line one.",
    "Second paragraph line two.",
    "",
    "Third paragraph.",
    "",
  ].join("\n");
  fs.writeFileSync(filePath, source);
  await vscode.commands.executeCommand("workbench.action.closeAllEditors");
  await vscode.commands.executeCommand("workbench.action.joinAllGroups");
  const document = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
  await vscode.commands.executeCommand(
    "vscode.openWith", document.uri, "markdown-okf-schema-studio.editor", vscode.ViewColumn.One,
  );
  await waitFor("the keyboard-navigation preview", () => getActivePreviewForTests()?.phase === "ready");
  let frame = await previewFrame(page);
  const editButton = frame.locator("[data-sphinx-preview-edit-toggle]");
  const anchorButton = frame.locator("[data-sphinx-preview-anchor]");
  assert.equal(await anchorButton.isDisabled(), true);
  if (await editButton.getAttribute("aria-pressed") !== "true") await editButton.click();
  await frame.locator('p[data-sphinx-source-line="3"]').click();
  let textarea = frame.locator("[data-sphinx-preview-block-editor] textarea");
  await textarea.waitFor();
  await textarea.fill("Edited first paragraph.\nEdited second line.");
  await textarea.evaluate((element: HTMLTextAreaElement) =>
    element.setSelectionRange(element.value.length, element.value.length));
  await textarea.press("ArrowRight");
  await waitFor("the edited first paragraph to reach the source document", () =>
    document.getText().includes("Edited first paragraph.\nEdited second line."),
  );

  let editor = await waitForBlockEditor(
    page,
    "right-arrow transfer to the second paragraph",
    (value) => value.startsWith("Second paragraph line one."),
  );
  frame = editor.frame;
  textarea = editor.textarea;
  assert.deepEqual(
    await textarea.evaluate((element: HTMLTextAreaElement) => [element.selectionStart, element.selectionEnd]),
    [0, 0],
  );
  assert.match(document.getText(), /Edited first paragraph\.\nEdited second line\./u);

  await textarea.evaluate((element: HTMLTextAreaElement) =>
    element.setSelectionRange(element.value.length, element.value.length));
  await textarea.press("ArrowDown");
  editor = await waitForBlockEditor(
    page,
    "down-arrow transfer to the third paragraph",
    (value) => value === "Third paragraph.",
  );
  frame = editor.frame;
  textarea = editor.textarea;
  assert.deepEqual(
    await textarea.evaluate((element: HTMLTextAreaElement) => [element.selectionStart, element.selectionEnd]),
    [0, 0],
  );

  await textarea.press("ArrowUp");
  editor = await waitForBlockEditor(
    page,
    "up-arrow transfer to the second paragraph",
    (value) => value.startsWith("Second paragraph line one."),
  );
  frame = editor.frame;
  textarea = editor.textarea;
  const secondLength = editor.value.trimEnd().length;
  assert.deepEqual(
    await textarea.evaluate((element: HTMLTextAreaElement) => [element.selectionStart, element.selectionEnd]),
    [secondLength, secondLength],
  );

  await textarea.evaluate((element: HTMLTextAreaElement) => element.setSelectionRange(0, 0));
  await textarea.press("ArrowLeft");
  editor = await waitForBlockEditor(
    page,
    "left-arrow transfer back to the edited paragraph",
    (value) => value.startsWith("Edited first paragraph."),
  );
  frame = editor.frame;
  textarea = editor.textarea;
  const edited = editor.value;
  assert.deepEqual(
    await textarea.evaluate((element: HTMLTextAreaElement) => [element.selectionStart, element.selectionEnd]),
    [edited.trimEnd().length, edited.trimEnd().length],
  );
  await capture(frame, document, edited);
  console.log("PASS block keyboard navigation E2E");
}

// @tests_req StRS-MDOKFSTUDIO-LIFE-010
// @tests_req StRS-MDOKFSTUDIO-TOOLBAR-013
// @tests_req SwRS-MDOKFSTUDIO-LIFE-100
// @tests_req SwRS-MDOKFSTUDIO-LIFE-108
// @tests_req SwRS-MDOKFSTUDIO-LIFE-119
export async function run(): Promise<void> {
  assert.ok(process.env.STUDIO_CDP_PORT, "the E2E runner must expose a loopback CDP port");
  await pinStoredWorkspaceChoices();
  // CDP input needs a window macOS has activated (windowFocus.ts).
  await ensureTestWindowFocused();
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.STUDIO_CDP_PORT}`);
  const page = browser.contexts()[0].pages().find((candidate) => candidate.url().includes("workbench"));
  assert.ok(page, "the VS Code workbench is attached");
  await page.setViewportSize({ width: 1440, height: 900 });
  const directory = fs.mkdtempSync(path.join("/tmp", "studio-scroll-"));
  const filePath = path.join(directory, "long-scroll.md");
  const sections = Array.from({ length: 800 }, (_, index) => [
    `## Section ${index + 1}`,
    "",
    `Paragraph ${index + 1}: a source-mapped block with enough text to wrap in the preview pane.`,
    "Another source line keeps the paragraph mapping distinct from the following heading.",
    "",
  ].join("\n"));
  fs.writeFileSync(filePath, `# Long scroll regression\n\n${sections.join("\n")}\nFinal sentinel.\n`);
  // The suite writes its own INDEX.md (writeReport); the shared writer handles the captures.
  const evidence = new RealWindowEvidence("scroll", { indexTitle: false });
  const artifacts = evidence.directory;
  let scenario = "setup";
  const checkpoints: Array<Record<string, unknown>> = [];
  const passedScenarios: string[] = [];
  let outcome = "running";
  let suiteError: string | undefined;
  let diagnosticError: string | undefined;
  let revision = "unavailable";
  try { revision = execFileSync("git", ["rev-parse", "HEAD"], { cwd: __dirname, encoding: "utf8" }).trim(); }
  catch {}
  const writeReport = (): void => {
    evidence.writeManifest({
      outcome, revision, command: process.env.STUDIO_AUDIT_COMMAND ?? "npm run test:scroll",
      runId: process.env.STUDIO_E2E_RUN_ID ?? null,
      campaignStartedAt: process.env.STUDIO_E2E_STARTED_AT ?? null,
      campaignCommand: process.env.STUDIO_E2E_COMMAND ?? null,
      startedAt: process.env.STUDIO_E2E_STARTED_AT ?? null,
      completedAt: new Date().toISOString(),
      scenario, passedScenarios,
      error: suiteError, diagnosticError, checkpoints,
    });
    fs.writeFileSync(path.join(artifacts, "INDEX.md"), [
      "# Scroll E2E review", "", `Suite: ${outcome}. Revision: ${revision}.`,
      `Command: ${process.env.STUDIO_AUDIT_COMMAND ?? "npm run test:scroll"}`, "",
      "Review in numerical order. Each image has matching Markdown and JSON notes with state and actions.",
      "Check useful pane width, selected toolbar controls, visible expected content, unobscured text,",
      "and sticky headings below the toolbar without overlap. Offscreen block editors are intentional",
      "during long scrolling. Images cannot prove event history, wheel causality, feedback stability,",
      "or keyboard transfers; those are verified by assertions. Failure images are diagnostic only.", "",
      ...checkpoints.map((entry) => `- [${entry.name}](${entry.image}) - ${entry.expected}`),
      "", ...(suiteError ? [`Error: ${suiteError}`] : []),
      ...(diagnosticError ? [`Diagnostic capture error: ${diagnosticError}`] : []),
    ].join("\n"));
    fs.writeFileSync(path.join(path.dirname(artifacts), "LATEST.md"),
      `# Latest scroll integration run\n\n[Review this run](${path.basename(artifacts)}/INDEX.md)\n\nStatus: ${outcome}.\n`);
  };
  const capture = async (
    name: string, frame: Frame, expected: string, actions: string,
    sourceScroll: number | null, editorValue?: string,
  ): Promise<void> => {
    const state = await frame.evaluate(() => ({
      previewScroll: window.scrollY,
      previewMax: document.documentElement.scrollHeight - window.innerHeight,
      editing: document.querySelector("[data-sphinx-preview-edit-toggle]")?.getAttribute("aria-pressed"),
      anchored: document.querySelector("[data-sphinx-preview-anchor]")?.getAttribute("aria-pressed"),
      sticky: document.querySelector<HTMLElement>("[data-sphinx-preview-sticky-headings]")?.hidden,
    }));
    assert.equal(state.editing, "true", "canonical checkpoints use block editing mode");
    assert.equal(
      state.anchored,
      String(!scenario.includes("independent") && vscode.window.visibleTextEditors.length > 0),
      "checkpoint sync control",
    );
    assert.ok(Number.isFinite(state.previewScroll));
    assert.ok(sourceScroll === null || sourceScroll >= 0, "sourceScroll is explicitly observed");
    const textarea = frame.locator("[data-sphinx-preview-block-editor] textarea");
    assert.equal(await textarea.count(), 1, "exactly one active block editor");
    assert.equal(await textarea.inputValue(), editorValue, "active block identity/value survives actions");
    const editorInViewport = await textarea.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return bounds.bottom > 0 && bounds.top < window.innerHeight;
    });
    assert.equal(editorInViewport, state.previewScroll < 3, "first block is offscreen only while scrolled");
    if (state.previewScroll < 3) {
      assert.ok(await frame.locator("h1").first().evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return bounds.top >= 0 && bounds.bottom <= window.innerHeight;
      }), "fixture title is visible at top");
      assert.equal(state.sticky, true, "top checkpoint has no sticky heading band");
    } else {
      assert.ok(Math.abs(state.previewScroll - state.previewMax) < 3, "bottom checkpoint reaches endpoint");
      assert.ok(await frame.getByText("Final sentinel.", { exact: true }).evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return bounds.top >= 0 && bounds.bottom <= window.innerHeight;
      }), "bottom checkpoint visibly contains the sentinel");
    }
    const visibleSource = vscode.window.visibleTextEditors;
    assert.equal(visibleSource.length, sourceScroll === null ? 0 : 1, "source visibility matches setup");
    if (sourceScroll !== null) {
      assert.equal(visibleSource[0].document.uri.fsPath, filePath, "source editor targets the scroll fixture");
      assert.equal(visibleSource[0].visibleRanges[0]?.start.line, sourceScroll);
      if (name === "preview-independent-bottom") assert.equal(sourceScroll, 0);
      if (name === "paired-aligned-bottom" || name === "source-independent-bottom") {
        assert.ok(visibleSource[0].visibleRanges.some((range) => range.contains(
          new vscode.Position(visibleSource[0].document.lineCount - 2, 0))),
        "source checkpoint visibly contains the final sentinel line");
      }
    }
    const captureId = captureByLegacy("scroll", name)?.id;
    assert.ok(captureId, `no registered scroll capture was named "${name}"`);
    const image = captureFile(captureId, "png");
    const note = { summary: expected,
      info: { scenario, viewport: page.viewportSize() },
      name, image, scenario, expected, actions, sourceScroll, ...state, editorValue, editorInViewport,
      mode: "block editing", sync: state.anchored === "true" ? "anchored" : "independent",
      sourceFixture: visibleSource[0]?.document.uri.fsPath ?? null,
      fixture: scenario === "keyboard-navigation" ? "keyboard-navigation.md" : "long-scroll.md",
      setup: "1440x900 viewport; sidebar/chat closed; solo single group or paired source left / preview right",
      limitations: "Screenshot proves final visible state only; ordered actions are assertion-backed." };
    const screenshot = await evidence.shoot(page, frame, captureId);
    assert.ok(screenshot, "scroll checkpoints are never assertion-only");
    if (state.previewScroll > 3) {
      const pane = await (await frame.frameElement()).boundingBox();
      assert.ok(pane);
      const textBounds = await frame.getByText("Final sentinel.", { exact: true }).evaluate(element => {
        const range = document.createRange();
        range.selectNodeContents(element);
        const bounds = range.getBoundingClientRect();
        const hit = document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
        return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height,
          unobscured: hit !== null && element.contains(hit) };
      });
      assert.equal(textBounds.unobscured, true, "bottom sentinel text is not covered by sticky headings");
      const bounds = { ...textBounds, x: pane.x + textBounds.x, y: pane.y + textBounds.y };
      if (sourceScroll !== null) assert.ok(pane.x >= 700, "paired preview pixel sample targets the right pane");
      assert.ok(bounds.x >= pane.x && bounds.x + bounds.width <= pane.x + pane.width);
      assert.ok(bounds.y >= pane.y && bounds.y + bounds.height <= pane.y + pane.height);
      const colors = await page.evaluate(async ({ encoded, bounds }) => {
        const bytes = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
        const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Screenshot pixel decoder unavailable");
        context.drawImage(bitmap, 0, 0);
        const pixels = context.getImageData(Math.floor(bounds.x), Math.floor(bounds.y),
          Math.ceil(bounds.width), Math.ceil(bounds.height)).data;
        const unique = new Set<string>();
        for (let offset = 0; offset < pixels.length; offset += 4) {
          unique.add(`${pixels[offset]},${pixels[offset + 1]},${pixels[offset + 2]}`);
        }
        bitmap.close();
        return unique.size;
      }, { encoded: screenshot.toString("base64"), bounds });
      assert.ok(colors > 8, `captured bottom sentinel must contain rendered text, observed ${colors} colors`);
    }
    evidence.record(captureId, { note: `Expected: ${expected}`, json: note, markdown: [
      `![Checkpoint](${path.basename(image)})`, "",
      `Setup: ${note.setup}`, `Fixture: ${note.fixture}`, `Scenario: ${scenario}`, "",
      `Actions: ${actions}`, "", `Mode: ${note.mode}; sync: ${note.sync}.`,
      `Preview scroll: ${state.previewScroll}/${state.previewMax}; source first line: ${sourceScroll}.`,
      `Source identity: ${note.sourceFixture ?? "absent"}.`,
      `Active block: ${editorValue}; in viewport: ${editorInViewport}.`, "",
      "Visual checklist:", "- Useful pane widths and expected content visible.",
      "- Toolbar selections match mode and sync.", "- Sticky headings sit below the toolbar without overlap.",
      "- Text is unobscured; offscreen editors are intentional at bottom.", "", note.limitations,
    ].join("\n") });
    checkpoints.push(note);
    writeReport();
  };
  writeReport();
  try {
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    await vscode.commands.executeCommand("workbench.action.closeSidebar");
    await vscode.commands.executeCommand("workbench.action.closeAuxiliaryBar");
    await vscode.commands.executeCommand("workbench.action.joinAllGroups");
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
    assert.ok(document.lineCount > 4_000);
    await vscode.commands.executeCommand(
      "vscode.openWith", document.uri, "markdown-okf-schema-studio.editor", vscode.ViewColumn.One,
    );
    await waitFor("the custom editor render", () => getActivePreviewForTests()?.phase === "ready");
    assert.equal(getActivePreviewForTests()?.readOnly, false, "the fixture must support inline edits");
    let frame = await previewFrame(page);
    let anchorButton = frame.locator("[data-sphinx-preview-anchor]");
    let editButton = frame.locator("[data-sphinx-preview-edit-toggle]");
    const scrollTop = (): Promise<number> => frame.evaluate(() => window.scrollY);
    const maxScroll = (): Promise<number> => frame.evaluate(() =>
      window.document.documentElement.scrollHeight - window.innerHeight);
    assert.ok(await maxScroll() > 30_000, "the fixture requires many viewports of scrolling");
    let sourceEditor: vscode.TextEditor | undefined;
    const editorTop = (): number => sourceEditor?.visibleRanges[0]?.start.line ?? -1;
    const sourceAtEnd = (): boolean => sourceEditor?.visibleRanges.some((range) =>
      range.contains(new vscode.Position(document.lineCount - 2, 0))) ?? false;
    const previewShowsSourceAnchor = async (): Promise<boolean> => {
      const line = editorTop() + 1;
      const preview = getActivePreviewForTests();
      if (preview?.lastSourceScrollLine !== line) return false;
      const state = await frame.evaluate((sourceLine) => {
        const blocks = Array.from(window.document.querySelectorAll<HTMLElement>("[data-sphinx-source-line]"))
          .filter((element) => Number(element.dataset.sphinxSourceLine) <= sourceLine);
        const block = blocks.at(-1);
        if (!block) return { matches: false, sourceLine, blockLine: undefined };
        const bounds = block.getBoundingClientRect();
        const band = window.document.querySelector<HTMLElement>("[data-sphinx-preview-sticky-headings]");
        const controls = parseFloat(getComputedStyle(window.document.documentElement)
          .getPropertyValue("--sphinx-preview-controls-height")) || 0;
        const readingLine = band && !band.hidden ? band.getBoundingClientRect().bottom : controls;
        return {
          matches: bounds.bottom >= readingLine - 20
            && bounds.top <= readingLine + Math.max(20, bounds.height),
          sourceLine,
          blockLine: Number(block.dataset.sphinxSourceLine),
          blockTop: bounds.top,
          blockBottom: bounds.bottom,
          readingLine,
          scrollTop: window.scrollY,
        };
      }, line);
      return state.matches;
    };

    for (const withSource of [false, true]) {
      if (withSource) {
        await vscode.commands.executeCommand("workbench.action.closeAllEditors");
        await vscode.commands.executeCommand("workbench.action.editorLayoutTwoColumns");
        await vscode.commands.executeCommand(
          "vscode.openWith", document.uri, "markdown-okf-schema-studio.editor", vscode.ViewColumn.Two,
        );
        await waitFor("the fixture preview in the right editor group", () =>
          getActivePreviewPanelForTests()?.viewColumn === vscode.ViewColumn.Two
          && getActivePreviewForTests()?.documentUri === document.uri.toString()
          && getActivePreviewForTests()?.phase === "ready");
        sourceEditor = await vscode.window.showTextDocument(document, {
          viewColumn: vscode.ViewColumn.One, preserveFocus: true,
        });
        assert.equal(sourceEditor.document.uri.toString(), document.uri.toString(), "source target is the fixture");
        await settle();
        frame = await previewFrame(page);
        assert.equal(sourceEditor.viewColumn, vscode.ViewColumn.One, "source remains in the left group");
        anchorButton = frame.locator("[data-sphinx-preview-anchor]");
        editButton = frame.locator("[data-sphinx-preview-edit-toggle]");
      }
      for (const mode of ["reading", "editing", "block"] as const) {
        for (const anchored of [true, false]) {
          scenario = `${withSource ? "paired" : "solo"}-${mode}-${anchored ? "anchored" : "independent"}`;
          if (await editButton.getAttribute("aria-pressed") === "true") await editButton.click();
          if (await anchorButton.getAttribute("aria-pressed") === "true") await anchorButton.click();
          await scrollPane(page, frame, "preview", false);
          if (sourceEditor) {
            sourceEditor.revealRange(new vscode.Range(0, 0, 0, 0), vscode.TextEditorRevealType.AtTop);
          }
          await settle();
          if (mode !== "reading") await editButton.click();
          if (anchored && withSource) await anchorButton.click();
          await settle();
          if (mode === "block") {
            await frame.locator("p[data-sphinx-source-line]").first().click();
            await frame.locator("[data-sphinx-preview-block-editor] textarea").waitFor();
          }
          await settle();
          assert.equal(await editButton.getAttribute("aria-pressed"), String(mode !== "reading"));
          if (withSource) {
            assert.equal(await anchorButton.getAttribute("aria-pressed"), String(anchored));
          } else {
            // No text editor shows the file: the anchor button is disabled and cannot be pressed.
            assert.equal(await anchorButton.isDisabled(), true);
            assert.equal(await anchorButton.getAttribute("title"), "No text editor shows this file");
            assert.equal(await anchorButton.getAttribute("aria-pressed"), "false");
          }
          const blockValue = mode === "block"
            ? await frame.locator("[data-sphinx-preview-block-editor] textarea").inputValue() : undefined;
          if (blockValue) assert.match(blockValue, /^Paragraph 1:/u);
          if (!withSource) {
            assert.equal(vscode.window.visibleTextEditors.length, 0, "solo preview must not open a source editor");
          }
          for (let cycle = 0; cycle < 2; cycle += 1) {
            for (const down of [true, false]) {
              const oldEditorTop = editorTop();
              await scrollPane(page, frame, "preview", down);
              await waitFor(`${scenario}: preview reaches ${down ? "end" : "beginning"}`, async () =>
                down ? Math.abs(await scrollTop() - await maxScroll()) < 3 : await scrollTop() < 3);
              if (withSource && anchored) {
                await waitFor(`${scenario}: source follows preview`, () =>
                  down ? sourceAtEnd() : editorTop() === 0);
              }
              const expectedPreviewTop = await scrollTop();
              await settle();
              assert.ok(Math.abs(await scrollTop() - expectedPreviewTop) < 3, `${scenario}: no scroll feedback`);
              if (withSource && !anchored) {
                assert.equal(editorTop(), oldEditorTop, `${scenario}: source remains still`);
              }
              assert.ok(down ? Math.abs(await scrollTop() - await maxScroll()) < 3 : await scrollTop() < 3);
              if (sourceEditor) assert.equal(sourceEditor.document.uri.toString(), document.uri.toString());
              if (mode === "block") {
                assert.equal(await frame.locator("[data-sphinx-preview-block-editor] textarea").inputValue(), blockValue);
              }
              if (down) {
                assert.ok(await frame.getByText("Final sentinel.", { exact: true }).evaluate((element) => {
                  const bounds = element.getBoundingClientRect();
                  return bounds.top >= 0 && bounds.bottom <= window.innerHeight;
                }), "bottom sentinel is visibly inside the preview");
              } else {
                assert.equal(await frame.locator("[data-sphinx-preview-sticky-headings]").evaluate(
                  (element: HTMLElement) => element.hidden), true, "sticky heading clears at top");
              }
              if (cycle === 0 && mode === "block" && (anchored || withSource) &&
                  ((!withSource && anchored) || (withSource && down))) {
                await capture(!withSource ? (down ? "solo-bottom" : "return-top")
                  : anchored ? "paired-aligned-bottom" : "preview-independent-bottom", frame,
                down ? `Final sentinel visible; source ${withSource ? anchored ? "at end" : "at top" : "absent"}`
                  : "Title and first paragraph editor visible; sticky band cleared",
                `Reset top; select block mode and sync=${anchored}; preview wheel ${down ? "down" : "up"}`,
                withSource ? editorTop() : null, blockValue);
              }
            }
            if (withSource) {
              for (const down of [true, false]) {
                const oldPreviewTop = await scrollTop();
                const oldSourceTop = editorTop();
                await scrollPane(page, frame, "source", down);
                await waitFor(`${scenario}: source wheel moves independently of drag`, () =>
                  down ? editorTop() > oldSourceTop : editorTop() < oldSourceTop);
                await settle();
                if (!anchored) assert.ok(Math.abs(await scrollTop() - oldPreviewTop) < 3,
                  `${scenario}: source wheel does not move independent preview`);
                else await waitFor(`${scenario}: preview follows wheel before drag`, async () =>
                  down ? await scrollTop() > oldPreviewTop : await scrollTop() < oldPreviewTop);
                const beforeDrag = editorTop();
                await dragSourceScrollbar(page, down);
                await waitFor(`${scenario}: source scrollbar drag moves`, () =>
                  down ? sourceAtEnd() || editorTop() > beforeDrag : editorTop() === 0 || editorTop() < beforeDrag);
                const endpoint = down ? document.lineCount - 2 : 0;
                sourceEditor?.revealRange(new vscode.Range(endpoint, 0, endpoint, 0),
                  vscode.TextEditorRevealType.AtTop);
                await waitFor(`${scenario}: source reaches ${down ? "end" : "beginning"}`, () =>
                  down ? sourceAtEnd() : editorTop() === 0);
                if (anchored) {
                  await waitFor(`${scenario}: preview follows source`, async () =>
                    down ? await previewShowsSourceAnchor() : await scrollTop() < 3);
                }
                await settle();
                if (!anchored) {
                  assert.ok(Math.abs(await scrollTop() - oldPreviewTop) < 3, `${scenario}: preview remains still`);
                }
                assert.ok(down ? sourceAtEnd() : editorTop() === 0);
                assert.ok(anchored ? down ? await previewShowsSourceAnchor()
                  : await scrollTop() < 3 : Math.abs(await scrollTop() - oldPreviewTop) < 3);
                if (cycle === 0 && mode === "block" && !anchored && down) {
                  assert.equal(await frame.locator("[data-sphinx-preview-block-editor] textarea").inputValue(), blockValue);
                  await capture("source-independent-bottom", frame,
                    "Source final sentinel visible; preview title and first paragraph editor at top",
                    "Preview wheel returned top; source wheel and scrollbar drag asserted movement; TextEditor.revealRange positioned the source endpoint without changing the active preview editor",
                    editorTop(), blockValue);
                }
                if (anchored && !down) {
                  assert.equal(editorTop(), 0, `${scenario}: source stays at the revisited top`);
                }
              }
            }
          }
          if (mode === "block") {
            assert.equal(await frame.locator("[data-sphinx-preview-block-editor] textarea").count(), 1,
              `${scenario}: block editor stays open through scrolling`);
          }
          passedScenarios.push(scenario);
          console.log(`PASS scroll E2E: ${scenario}`);
        }
      }
    }
    assert.equal(document.getText(), fs.readFileSync(filePath, "utf8"), "scrolling must not edit the document");
    scenario = "width-cycle-reading-line";
    {
      const widthFrame = await previewFrame(page);
      await widthFrame.evaluate(() => window.scrollTo(0, Math.floor(window.document.documentElement.scrollHeight / 2)));
      await settle();
      const probe = (): Promise<{ id: string; top: number }> => widthFrame.evaluate(() => {
        const heading = [...window.document.querySelectorAll("#sphinx-myst-preview-content h2")]
          .find((candidate) => candidate.getBoundingClientRect().top >= 160);
        return { id: heading?.textContent ?? "", top: heading?.getBoundingClientRect().top ?? -1 };
      });
      const before = await probe();
      assert.ok(before.id.length > 0, "a heading is visible at mid-document");
      const widthButton = widthFrame.locator("[data-sphinx-preview-width-toggle]");
      for (const expected of ["auto", "full", "margin"]) {
        await widthButton.click();
        await settle();
        assert.equal(await widthFrame.locator("html").getAttribute("data-sphinx-preview-width"), expected);
        const heading = await widthFrame.evaluate((text) => {
          const match = [...window.document.querySelectorAll("#sphinx-myst-preview-content h2")]
            .find((candidate) => candidate.textContent === text);
          return match ? match.getBoundingClientRect().top : -1;
        }, before.id);
        assert.ok(Math.abs(heading - before.top) <= 40, `${expected}: the reading line moved from ${before.top} to ${heading}`);
      }
    }
    passedScenarios.push(scenario);
    scenario = "keyboard-navigation";
    await runBlockNavigation(page, directory, async (keyboardFrame, keyboardDocument, value) => {
      assert.equal(await keyboardFrame.locator("[data-sphinx-preview-edit-toggle]").getAttribute("aria-pressed"), "true");
      assert.equal(await keyboardFrame.locator("[data-sphinx-preview-anchor]").getAttribute("aria-pressed"), "false");
      assert.equal(await keyboardFrame.locator("[data-sphinx-preview-anchor]").isDisabled(), true);
      assert.equal(vscode.window.visibleTextEditors.length, 0);
      assert.match(keyboardDocument.getText(), /Edited first paragraph\./u);
      assert.equal(await keyboardFrame.locator("[data-sphinx-preview-block-editor] textarea").inputValue(), value);
      assert.ok(await keyboardFrame.locator("[data-sphinx-preview-block-editor] textarea").isVisible());
      assert.equal(await keyboardFrame.evaluate(() => window.scrollY), 0);
      await capture("keyboard-return", keyboardFrame,
        "Edited first paragraph active, caret at end; second and third paragraphs visible",
        "Edit first; ArrowRight to second; ArrowDown to third; ArrowUp to second; ArrowLeft to first",
        null, value);
    });
    passedScenarios.push(scenario);
    scenario = "block-move-keeps-position";
    await runBlockMove(page, directory);
    passedScenarios.push(scenario);
    evidence.assertComplete();
    outcome = "pass";
  } catch (error) {
    outcome = "fail";
    suiteError = error instanceof Error ? error.stack ?? error.message : String(error);
    try {
      const image = `FAILED-${scenario}.png`;
      await page.screenshot({ path: path.join(artifacts, image) });
      const note = { name: `FAILED-${scenario}`, image, scenario,
        expected: "Diagnostic only: consult the original assertion error", error: suiteError,
        setup: "Last attempted scenario; state is not asserted", actions: "Interrupted by original failure",
        limitations: "No pass claim; screenshot cannot establish history or expected state" };
      fs.writeFileSync(path.join(artifacts, `FAILED-${scenario}.json`), JSON.stringify(note, null, 2));
      checkpoints.push(note);
    }
    catch (captureError) { diagnosticError = String(captureError); }
    throw error;
  } finally {
    writeReport();
    disposeActivePreviewForTests();
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    await browser.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
}
