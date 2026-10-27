import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import {
  type Frame,
  type Page,
} from "playwright-core";

import {
  getActivePreviewForTests,
  resetRenderHooksForTests,
  setRenderDelayForTests,
  setRenderOverrideForTests,
} from "../extensionApi";
import {
  bufferText,
  closeAllEditors,
  createFixture,
  type Evidence,
  findCurrentFrame,
  htmlAssignmentCount,
  lines,
  openSidePreview,
  openStudioEditor,
  press,
  setEditMode,
  typeText,
  waitFor,
  waitForEditor,
  waitForRender,
  withCurrentFrame,
  writeSchema,
} from "./harness";
import { captureAfter, escapeBlockEditor, realInputId, SMOKE, waitForNoBlockEditor, withDocument, withSmokeDocument } from "./common";

/** Opening a preview triggers follow-up renders; waits until the assignment counter stays put. */
async function waitForRenderChurnToSettle(): Promise<void> {
  let lastSeen = "";
  let stableSince = Date.now();
  let lastCount = htmlAssignmentCount();
  try {
    await waitFor("the render churn after opening to settle", () => {
      const preview = getActivePreviewForTests();
      const count = htmlAssignmentCount();
      lastSeen = JSON.stringify({ count, phase: preview?.phase, ready: preview?.webviewReady, status: preview?.status });
      if (count !== lastCount) {
        lastCount = count;
        stableSince = Date.now();
      }
      return Date.now() - stableSince >= 2_500 && preview?.phase === "ready" && preview.webviewReady === true;
    }, 40_000);
  } catch (error) {
    throw new Error(String(error) + " last=" + lastSeen);
  }
}

/**
 * RI-T43: typing on a rendered page assigns the webview document once (the ready render), not
 * twice; a slow render shows a floating overlay after 1.5 s and nothing in the page moves.
 */
export async function scenarioPendingOverlayWithoutReload(page: Page, evidence: Evidence): Promise<void> {
  const body = Array.from({ length: 60 }, (_, index) => "Paragraph " + index + " keeps the reader busy.")
    .join("\n\n");
  await withDocument("realinput-t43", "# Pending overlay\n\n" + body + "\n", async (source) => {
    await openSidePreview(source);
    await waitForRender(source);
    await waitFor("the ready webview", async () => (await findCurrentFrame(page)) !== undefined);
    const editor = await vscode.window.showTextDocument(source, vscode.ViewColumn.One);
    const end = source.positionAt(source.getText().length);
    editor.selection = new vscode.Selection(end, end);
    await waitForRenderChurnToSettle();
    const frame = await withCurrentFrame(page, async (current) => current);
    // Editor-to-preview sync would scroll the page on its own when the source changes; switch it
    // off so that only the pending state could move the content.
    const anchorButton = frame.locator("[data-sphinx-preview-anchor]");
    if (await anchorButton.getAttribute("aria-pressed") === "true") {
      await anchorButton.click();
      await waitFor("anchoring to be off", async () => await anchorButton.getAttribute("aria-pressed") === "false");
    }
    const bounds = await (await frame.frameElement()).boundingBox();
    assert.ok(bounds, "the preview pane is visible");
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + Math.min(200, bounds.height / 2));
    await page.mouse.wheel(0, 300);
    await new Promise((resolve) => setTimeout(resolve, 500));
    await vscode.window.showTextDocument(source, vscode.ViewColumn.One);
    const paragraphTop = (current: Frame): Promise<number> =>
      current.locator("p[data-sphinx-source-line]").nth(30).evaluate((element) => element.getBoundingClientRect().top);
    const a0 = htmlAssignmentCount();
    assert.ok(await frame.evaluate(() => window.scrollY) > 0, "the preview is scrolled");

    // Fast render: one assignment (the ready render), and the overlay never appears.
    const shownBefore = getActivePreviewForTests()?.pendingOverlayShown ?? 0;
    await page.keyboard.type("x");
    await waitForRender(source);
    await waitFor("the fast render to settle", () => getActivePreviewForTests()?.status === "success");
    await waitForRenderChurnToSettle();
    assert.equal(htmlAssignmentCount() - a0, 1, "one html assignment for a fast edit");
    assert.equal(getActivePreviewForTests()?.pendingOverlayShown ?? 0, shownBefore, "no overlay for a fast render");
    console.log("RI-T43 fast edit html assignments: " + (htmlAssignmentCount() - a0));

    // Slow render: the page stays still, the overlay appears after about 1.5 s.
    const slowFrame = await withCurrentFrame(page, async (current) => current);
    const top1 = await paragraphTop(slowFrame);
    const a1 = htmlAssignmentCount();
    let overlayTop = Number.NaN;
    try {
      setRenderDelayForTests(6_000);
      await page.keyboard.type("y");
      await waitFor("the pending status", () => getActivePreviewForTests()?.status === "pending");
      assert.equal(htmlAssignmentCount(), a1, "pending must not assign the webview html");
      assert.equal(getActivePreviewForTests()?.pendingOverlayVisible, false, "no overlay before the delay");
      assert.equal(await slowFrame.locator("#sphinx-myst-preview-content").count(), 1, "the same page is still shown");
      assert.equal(await slowFrame.locator("[data-sphinx-preview-pending-overlay]").count(), 0);
      assert.ok(Math.abs(await paragraphTop(slowFrame) - top1) <= 1, "the page does not move while pending");
      try {
        await waitFor("the pending overlay", async () =>
          getActivePreviewForTests()?.pendingOverlayVisible === true
          && await slowFrame.locator("[data-sphinx-preview-pending-overlay]").isVisible(), 4_000);
      } catch (error) {
        const preview = getActivePreviewForTests();
        throw new Error(String(error) + " phase=" + preview?.phase + " status=" + preview?.status
          + " visible=" + preview?.pendingOverlayVisible + " shown=" + preview?.pendingOverlayShown
          + " ready=" + preview?.webviewReady + " overlays="
          + await slowFrame.locator("[data-sphinx-preview-pending-overlay]").count());
      }
      assert.equal(htmlAssignmentCount(), a1, "the overlay does not reload the page");
      const delta = Math.abs(await paragraphTop(slowFrame) - top1);
      assert.ok(delta <= 1, "the page does not move when the overlay appears: " + delta);
      console.log("RI-T43 slow edit: assignments " + (htmlAssignmentCount() - a1) + ", paragraph shift "
        + delta + " px");
      const text = await slowFrame.locator("[data-sphinx-preview-pending-overlay]").innerText();
      assert.ok(/Preview pending\s*\n+\s*\S/u.test(text), "label and message on two lines: " + JSON.stringify(text));
      overlayTop = await slowFrame.locator("[data-sphinx-preview-pending-overlay]")
        .evaluate((element) => element.getBoundingClientRect().top);
      const toolbarBottom = await slowFrame.locator("[data-sphinx-preview-toolbar]")
        .evaluate((element) => element.getBoundingClientRect().bottom);
      assert.ok(overlayTop >= toolbarBottom - 1, "the overlay sits below the toolbar");
      await evidence.capture(page, slowFrame, "lifecycle-sync/r09-pending-overlay",
        "A slow render: the previous page stays still and a floating overlay says the preview is pending.");
    } finally {
      resetRenderHooksForTests();
    }
    await waitForRender(source);
    await waitFor("the settled render", () => getActivePreviewForTests()?.status === "success");
    await waitForRenderChurnToSettle();
    assert.equal(htmlAssignmentCount() - a1, 1, "one html assignment for the slow edit");
    assert.equal(getActivePreviewForTests()?.pendingOverlayVisible, false);
    const current = await withCurrentFrame(page, async (frame2) => frame2);
    assert.equal(await current.locator("[data-sphinx-preview-pending-overlay]").count(), 0, "the overlay is gone");
  });
}

const T30_DOCUMENT = [
  "---",
  "type: req",
  "title: In-place table",
  "related: target.md",
  "---",
  "",
  "# Body",
  "",
  "Some text.",
  "",
].join("\n");

const T30_SCHEMA = [
  "type: object",
  "properties:",
  "  type:",
  "    type: string",
  "  title:",
  "    type: string",
  "  related:",
  "    type: string",
  "    x-okf-link:",
  "      resolution: document-relative",
  "      syntax: plain",
  "      tooltip_shows_fields: [description]",
  "      preview_shows_fields: [description]",
  "",
].join("\n");

const T30_TARGET = (description: string): string => "---\ndescription: " + description + "\n---\n# Target\n";

/**
 * RI-T30: typing in the body costs one html assignment per ready render (the properties table is
 * patched in place), and a change to a linked file updates the excerpt in the same frame.
 */
export async function scenarioPropertiesTableWithoutReload(page: Page, evidence: Evidence): Promise<void> {
  const fixture = createFixture("realinput-t30", {
    "smoke.md": T30_DOCUMENT,
    "target.md": T30_TARGET("Original excerpt"),
  });
  try {
    writeSchema(fixture.directory, "req", T30_SCHEMA);
    const source = await vscode.workspace.openTextDocument(vscode.Uri.file(fixture.path("smoke.md")));
    try {
      await openSidePreview(source);
      await waitForRender(source, (html) => html.includes("Original excerpt"));
      await waitFor("the ready webview", async () => (await findCurrentFrame(page)) !== undefined);
      await waitForRenderChurnToSettle();
      const frame = await withCurrentFrame(page, async (current) => current);
      const excerpt = frame.locator('[data-okf-field="related"] .okf-link-excerpt');
      await waitFor("the link excerpt in the page", async () => await excerpt.count() === 1);
      assert.equal(await excerpt.textContent(), "Original excerpt");
      const editor = await vscode.window.showTextDocument(source, vscode.ViewColumn.One);
      const end = source.positionAt(source.getText().length);
      editor.selection = new vscode.Selection(end, end);
      await waitFor("the caret at the end of the source", () =>
        vscode.window.activeTextEditor?.document === source
        && vscode.window.activeTextEditor.selection.active.isEqual(end));
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Typing in the body: every finished render replaces the page once, and nothing else may.
      // `renderedStages` counts the finished renders exactly; sampling the phase would miss the
      // ones that are followed at once by the next build.
      const a0 = htmlAssignmentCount();
      const renders0 = getActivePreviewForTests()?.renderedStages ?? 0;
      await typeText(page, "abcdefghij", 60);
      assert.ok(source.getText().endsWith("Some text.\nabcdefghij"), "the text went to the body: "
        + JSON.stringify(source.getText()));
      await waitForRender(source);
      await waitFor("the render to be ready in the page", () => getActivePreviewForTests()?.webviewReady === true);
      await new Promise((resolve) => setTimeout(resolve, 600));
      const assignments = htmlAssignmentCount() - a0;
      const renders = (getActivePreviewForTests()?.renderedStages ?? 0) - renders0;
      console.log("RI-T30 typing: " + assignments + " html assignments, " + renders + " ready renders");
      assert.ok(renders >= 1, "at least one render finished");
      assert.ok(assignments <= renders,
        "html assignments (" + assignments + ") must not exceed ready renders (" + renders + ")");

      // A change to the linked file patches the excerpt in the same frame, without any assignment.
      await waitForRenderChurnToSettle();
      const settled = await withCurrentFrame(page, async (current) => current);
      await settled.evaluate(() => {
        (globalThis as unknown as { __t30Marker?: boolean }).__t30Marker = true;
      });
      await waitFor("the link excerpt after the render", async () =>
        await settled.locator('[data-okf-field="related"] .okf-link-excerpt').count() === 1);
      const a1 = htmlAssignmentCount();
      fs.writeFileSync(fixture.path("target.md"), T30_TARGET("Updated excerpt"));
      await waitFor("the excerpt to show the updated description", async () =>
        await settled.locator('[data-okf-field="related"] .okf-link-excerpt').textContent() === "Updated excerpt");
      assert.equal(htmlAssignmentCount(), a1, "the linked file change must not assign the html");
      assert.equal(await settled.evaluate(() =>
        (globalThis as unknown as { __t30Marker?: boolean }).__t30Marker), true, "the same page, not a reload");
      assert.equal(settled.isDetached(), false);
      await evidence.capture(page, settled, "lifecycle-sync/r05-linked-file-patched-in-place",
        "The linked file changed on disk: the excerpt updated in the open page without a reload.");
    } finally {
      await closeAllEditors();
    }
  } finally {
    fixture.dispose();
  }
}

const T34_DOCUMENT = [
  "# In-place content",
  "",
  "A paragraph before the diagram.",
  "",
  "```mermaid",
  "graph LR",
  "  input --> output",
  "```",
  "",
  "The last paragraph.",
  "",
].join("\n");

function contentPatchCount(): number {
  return getActivePreviewForTests()?.contentPatches ?? 0;
}

/** Runs `body` with preview.incrementalUpdates set in the workspace, then restores the setting. */
export async function withIncrementalUpdates(enabled: boolean, body: () => Promise<void>): Promise<void> {
  const configuration = vscode.workspace.getConfiguration("markdownOkfSchemaStudio.preview");
  const original = configuration.inspect<boolean>("incrementalUpdates")?.workspaceValue;
  await configuration.update("incrementalUpdates", enabled, vscode.ConfigurationTarget.Workspace);
  try {
    await body();
  } finally {
    await configuration.update("incrementalUpdates", original, vscode.ConfigurationTarget.Workspace);
  }
}

/**
 * RI-T34: typing in the source patches the content of the open preview page. The same frame stays
 * attached, shows the typed text, carries the identifiers of the host's render, and the webview
 * document is not assigned again. A Mermaid diagram is rendered again in the same frame, and a slow
 * render still shows the pending overlay and ends with a clean page. With the setting off, every
 * ready render assigns the document.
 */
export async function scenarioContentPatchedInPlace(page: Page, evidence: Evidence): Promise<void> {
  await withDocument("realinput-t34", T34_DOCUMENT, async (source) => {
    await openSidePreview(source);
    await waitForRender(source);
    await waitFor("the ready webview", async () => (await findCurrentFrame(page)) !== undefined);
    const editor = await vscode.window.showTextDocument(source, vscode.ViewColumn.One);
    const end = source.positionAt(source.getText().length);
    editor.selection = new vscode.Selection(end, end);
    await waitFor("the caret at the end of the source", () =>
      vscode.window.activeTextEditor?.document === source
      && vscode.window.activeTextEditor.selection.active.isEqual(end));
    await waitForRenderChurnToSettle();
    const frame = await withCurrentFrame(page, async (current) => current);
    assert.equal(getActivePreviewForTests()?.incrementalUpdates, true, "the setting is on by default");
    // The diagram of the first render is drawn by the page's own Mermaid script.
    await waitFor("the Mermaid diagram in the page", async () =>
      await frame.locator(".myst-mermaid-diagram img.myst-mermaid-image").count() === 1);
    await frame.evaluate(() => {
      (globalThis as unknown as { __t34Marker?: boolean }).__t34Marker = true;
    });
    const a0 = htmlAssignmentCount();
    const patches0 = contentPatchCount();
    const typed = "abcdefghijklmnopqrst";
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Twenty characters, one every 60 ms: the page is patched, never reloaded.
    await typeText(page, typed, 60);
    assert.ok(source.getText().endsWith("The last paragraph.\n" + typed), "the text went to the end of the source: "
      + JSON.stringify(source.getText().slice(-60)));
    await waitForRender(source);
    await waitFor("the render to be ready in the page", () => getActivePreviewForTests()?.webviewReady === true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    console.log("RI-T34 typing: " + (htmlAssignmentCount() - a0) + " html assignments, "
      + (contentPatchCount() - patches0) + " content patches");
    assert.equal(htmlAssignmentCount(), a0, "typing does not assign the webview document");
    assert.ok(contentPatchCount() > patches0, "the renders were applied as content patches");
    assert.equal(frame.isDetached(), false, "the frame the scenario started with is still attached");
    assert.equal(await frame.evaluate(() =>
      (globalThis as unknown as { __t34Marker?: boolean }).__t34Marker), true, "the same page, not a reload");
    await waitFor("the typed text in the page", async () =>
      (await frame.locator("#sphinx-myst-preview-content").innerText()).includes(typed));
    const preview = getActivePreviewForTests();
    assert.ok(preview?.requestId !== undefined);
    assert.equal(await frame.locator("html").getAttribute("data-sphinx-preview-request-id"), String(preview.requestId),
      "the page carries the identifiers of the host's render");
    assert.equal(await frame.locator("html").getAttribute("data-sphinx-preview-document-version"),
      String(source.version));
    assert.equal(await frame.locator("[data-sphinx-preview-status]").count(), 1, "one status region");
    assert.equal(await frame.locator("[data-sphinx-preview-status]").getAttribute("data-sphinx-preview-status"),
      "success");
    await waitFor("the Mermaid diagram drawn again in the same frame", async () =>
      await frame.locator(".myst-mermaid-diagram img.myst-mermaid-image").count() === 1);
    assert.equal(await frame.locator(".myst-mermaid-error").count(), 0, "no diagram error");
    await evidence.capture(page, frame, "lifecycle-sync/r06-content-patched-in-place",
      "Twenty characters typed in the source: the open page shows them and the diagram, without a reload.");

    // A slow render: the pending overlay appears over the page, the result lands as a patch, and
    // the overlay is gone afterwards. Nothing assigns the document.
    const a1 = htmlAssignmentCount();
    const patches1 = contentPatchCount();
    try {
      setRenderDelayForTests(5_000);
      await typeText(page, "yz", 30);
      await waitFor("the pending overlay", async () =>
        getActivePreviewForTests()?.pendingOverlayVisible === true
        && await frame.locator("[data-sphinx-preview-pending-overlay]").isVisible(), 6_000);
    } finally {
      resetRenderHooksForTests();
    }
    await waitForRender(source);
    await waitFor("the slow render to be ready in the page", () => getActivePreviewForTests()?.webviewReady === true);
    await waitFor("the overlay to be gone", async () =>
      await frame.locator("[data-sphinx-preview-pending-overlay]").count() === 0);
    assert.equal(htmlAssignmentCount(), a1, "the slow render did not assign the document");
    assert.ok(contentPatchCount() > patches1, "the slow render was applied as a content patch");
    assert.equal(getActivePreviewForTests()?.pendingOverlayVisible, false);
    await waitFor("the typed text of the slow render in the page", async () =>
      (await frame.locator("#sphinx-myst-preview-content").innerText()).includes(typed + "yz"));

    // A patched page keeps the nonce it was loaded with, and so does the host's record. A document
    // loaded from that record (here: the stale status after a failed render) gets a fresh nonce.
    const recordNonce = (): string | undefined =>
      /\bnonce="([^"]+)"/u.exec(getActivePreviewForTests()?.html ?? "")?.[1];
    const scriptNonce = (target: Frame): Promise<string | undefined> =>
      target.evaluate(() => (document.querySelector("script[nonce]") as HTMLScriptElement | null)?.nonce);
    const nonceBefore = await scriptNonce(frame);
    assert.ok(nonceBefore);
    assert.equal(recordNonce(), nonceBefore, "the record of a patched page carries the loaded nonce");
    try {
      setRenderOverrideForTests(() => {
        throw new Error("simulated render failure");
      });
      await typeText(page, "!", 30);
      await waitFor("the stale status", () => getActivePreviewForTests()?.status === "stale", 6_000);
    } finally {
      resetRenderHooksForTests();
    }
    await waitFor("a new document with a fresh nonce", async () => {
      const nonce = recordNonce();
      if (nonce === undefined || nonce === nonceBefore) return false;
      for (const candidate of page.frames()) {
        try {
          if (await candidate.locator("#sphinx-myst-preview-content").count() === 0) continue;
          if (await scriptNonce(candidate) === nonce) return true;
        } catch (error) {
          if (!/frame.*detach|execution context was destroyed|cannot find context/iu.test(String(error))) throw error;
        }
      }
      return false;
    }, 8_000);
    // The frame whose script carries the record's new nonce is a new document: the old one had nonceBefore.
    // The next good render is applied to the new document again.
    await typeText(page, "?", 30);
    await waitForRender(source);
    await waitFor("the recovered render in the page", () => getActivePreviewForTests()?.webviewReady === true);
    const recovered = await withCurrentFrame(page, async (current) => current);
    await waitFor("the recovered text in the page", async () =>
      (await recovered.locator("#sphinx-myst-preview-content").innerText()).includes(typed + "yz!?"));

    // With the setting off, every ready render assigns the document again.
    await withIncrementalUpdates(false, async () => {
      await waitFor("the preview to hold the setting", () => getActivePreviewForTests()?.incrementalUpdates === false);
      await waitForRenderChurnToSettle();
      const offAssignments = htmlAssignmentCount();
      const offPatches = contentPatchCount();
      const offFrame = await withCurrentFrame(page, async (current) => current);
      await vscode.window.showTextDocument(source, vscode.ViewColumn.One);
      await typeText(page, "123", 60);
      await waitForRender(source);
      await waitFor("the render to be ready in the page", () => getActivePreviewForTests()?.webviewReady === true);
      assert.ok(htmlAssignmentCount() > offAssignments, "with the setting off the document is assigned again");
      assert.equal(contentPatchCount(), offPatches, "with the setting off nothing is patched");
      await waitFor("the previous frame to be replaced", () => offFrame.isDetached());
    });
  });
}

/** About 70 KB of Markdown: headings, paragraphs, a table and a list in every section. */
function largeChapter(): string {
  const sections: string[] = ["# Large chapter", ""];
  for (let index = 1; index <= 70; index += 1) {
    sections.push(
      "## Section " + index,
      "",
      ("Paragraph text for section " + index + " keeps the reader busy with ordinary sentences. ").repeat(5).trim(),
      "",
      ("Second paragraph of section " + index + " has **bold** words and `inline code` too. ").repeat(4).trim(),
      "",
      "| Name | Value | Note |",
      "|------|-------|------|",
      ...Array.from({ length: 5 }, (_, row) => "| item " + row + " | " + (index * 10 + row) + " | row note |"),
      "",
      ...Array.from({ length: 5 }, (_, item) => "- list item " + item + " of section " + index),
      "",
    );
  }
  sections.push("The last paragraph.", "");
  return sections.join("\n");
}

const LARGE_DOCUMENT_CPU_THROTTLE = 6;

/**
 * RI-T34 on a large document: applying a patch takes long enough that the next render finishes
 * before the page acknowledged the previous one. Fast continuous typing must still never assign
 * the webview document.
 */
export async function scenarioLargeDocumentPatched(page: Page, evidence: Evidence): Promise<void> {
  const chapter = largeChapter();
  assert.ok(chapter.length > 65_000, "the fixture is about 70 KB: " + chapter.length);
  await withDocument("realinput-t34-large", chapter, async (source) => {
    await openSidePreview(source);
    await waitForRender(source);
    await waitFor("the ready webview", async () => (await findCurrentFrame(page)) !== undefined);
    const editor = await vscode.window.showTextDocument(source, vscode.ViewColumn.One);
    const end = source.positionAt(source.getText().length);
    editor.selection = new vscode.Selection(end, end);
    await waitFor("the caret at the end of the source", () =>
      vscode.window.activeTextEditor?.document === source
      && vscode.window.activeTextEditor.selection.active.isEqual(end));
    await waitForRenderChurnToSettle();
    const frame = await withCurrentFrame(page, async (current) => current);
    await frame.evaluate(() => {
      (globalThis as unknown as { __t34Marker?: boolean }).__t34Marker = true;
    });
    const a0 = htmlAssignmentCount();
    const patches0 = contentPatchCount();
    const typed = "abcdefghijklmnopqrstuvwxyz012345";
    // A slower machine makes applying a patch take longer than a render; slow the page's CPU down
    // so that the next render finishes before the page acknowledged the previous patch.
    const throttle = await page.context().newCDPSession(frame.parentFrame() ?? frame);
    try {
      await throttle.send("Emulation.setCPUThrottlingRate", { rate: LARGE_DOCUMENT_CPU_THROTTLE });
      await typeText(page, typed, 60);
      await waitForRender(source);
      await waitFor("the render to be ready in the page", () => getActivePreviewForTests()?.webviewReady === true, 30_000);
    } finally {
      await throttle.send("Emulation.setCPUThrottlingRate", { rate: 1 }).catch(() => undefined);
      await throttle.detach().catch(() => undefined);
    }
    await new Promise((resolve) => setTimeout(resolve, 600));
    console.log("RI-T34 large document typing: " + (htmlAssignmentCount() - a0) + " html assignments, "
      + (contentPatchCount() - patches0) + " content patches");
    assert.equal(htmlAssignmentCount(), a0, "typing in a large document does not assign the webview document");
    assert.ok(contentPatchCount() > patches0, "the renders were applied as content patches");
    assert.equal(await frame.evaluate(() =>
      (globalThis as unknown as { __t34Marker?: boolean }).__t34Marker), true, "the same page, not a reload");
    await waitFor("the typed text in the page", async () =>
      (await frame.locator("#sphinx-myst-preview-content").innerText()).includes(typed));
    assert.equal(await frame.locator("html").getAttribute("data-sphinx-preview-request-id"),
      String(getActivePreviewForTests()?.requestId));
  });
}

/**
 * RI-T28: an empty document is written from the preview alone (Start writing), then a block is
 * inserted between two blocks with the + button; turning edit mode on does not move the layout.
 */
export async function scenarioInsertBlocksFromPreview(page: Page, evidence: Evidence): Promise<void> {
  const DONE = "button[aria-label='Done editing']";
  await withDocument("realinput-t28", "", async (source) => {
    await openStudioEditor(source.uri);
    await waitForRender(source);
    await setEditMode(page, true);
    await withCurrentFrame(page, (frame) => frame.getByRole("button", { name: "Start writing" }).click());
    await waitForEditor(page, "[data-sphinx-preview-block-editor] textarea");
    await captureAfter(evidence, page, "block-editing/r15-start-writing-open",
      "Empty document, edit mode on; Start writing opened an empty editor with its placeholder.");
    await typeText(page, "# Incident review checklist");
    await press(page, "Enter");
    await press(page, "Enter");
    await typeText(page, "First paragraph.");
    await withCurrentFrame(page, (frame) => frame.locator(DONE).click());
    const first = "# Incident review checklist\n\nFirst paragraph.\n";
    try {
      await waitFor("the first block to reach the buffer", () => bufferText(source) === first);
    } catch (error) {
      throw new Error(String(error) + " Buffer: " + JSON.stringify(bufferText(source)));
    }
    await waitForRender(source);
    await waitForNoBlockEditor(page, "the block editor to close after Done");
    await waitFor("the heading to render", async () => {
      const current = await findCurrentFrame(page);
      return current !== undefined && await current.locator("h1", { hasText: "Incident review checklist" }).count() === 1;
    });

    await withCurrentFrame(page, async (frame) => {
      await frame.locator("h1[data-sphinx-source-line]").first().hover();
      await frame.locator("h1[data-sphinx-source-line] + .sphinx-preview-insert-point button:not([data-sphinx-move])").click();
    });
    await waitForEditor(page, "[data-sphinx-preview-block-editor] textarea");
    await typeText(page, "- check logs");
    await withCurrentFrame(page, (frame) => frame.locator(DONE).click());
    const second = "# Incident review checklist\n\n- check logs\n\nFirst paragraph.\n";
    try {
      await waitFor("the list to be inserted between the heading and the paragraph", () =>
        bufferText(source) === second);
    } catch (error) {
      throw new Error(String(error) + " Buffer: " + JSON.stringify(bufferText(source)));
    }
    await waitForRender(source);
    await waitForNoBlockEditor(page, "the block editor to close after the second Done");
    await waitFor("the list to render", async () => {
      const current = await findCurrentFrame(page);
      return current !== undefined && await current.locator("li", { hasText: "check logs" }).count() === 1;
    });
    await captureAfter(evidence, page, "block-editing/r16-insert-point-adds-block",
      "Edit mode on; the list was inserted between the heading and the paragraph with the + button.");

    // The T16 guarantee still holds with insertion points in the content.
    const measure = (): Promise<{ height: number; top: number }> => withCurrentFrame(page, (frame) =>
      frame.locator("p[data-sphinx-source-line]").last().evaluate((element) => ({
        height: document.documentElement.scrollHeight,
        top: element.getBoundingClientRect().top + window.scrollY,
      })));
    await setEditMode(page, false);
    await new Promise((resolve) => setTimeout(resolve, 300));
    const reading = await measure();
    await setEditMode(page, true);
    await new Promise((resolve) => setTimeout(resolve, 300));
    const editing = await measure();
    assert.ok(Math.abs(editing.height - reading.height) <= 2,
      "scrollHeight changed from " + reading.height + " to " + editing.height);
    assert.ok(Math.abs(editing.top - reading.top) <= 2,
      "last paragraph top moved from " + reading.top + " to " + editing.top);
  });
}

/**
 * RI-T28b: a block is inserted after a figure that is the last block of the document, with and
 * without a final line break, and lands after the closing fence with one blank line.
 */
export async function scenarioInsertAfterFinalFigure(page: Page, evidence: Evidence): Promise<void> {
  const DONE = "button[aria-label='Done editing']";
  const figure = ":::{figure} figure.svg\n:alt: A figure\n\nCaption.\n:::";
  const variants: Array<[string, string]> = [["with-newline", figure + "\n"], ["without-newline", figure]];
  for (const [name, text] of variants) {
    await withDocument("realinput-t28b-" + name, "# Figures\n\n" + text, async (source) => {
      await openStudioEditor(source.uri);
      await waitForRender(source);
      await setEditMode(page, true);
      await withCurrentFrame(page, async (frame) => {
        await frame.locator("figure[data-sphinx-source-line]").first().hover();
        await frame.locator("figure[data-sphinx-source-line] + .sphinx-preview-insert-point button:not([data-sphinx-move])").click();
      });
      await waitForEditor(page, "[data-sphinx-preview-block-editor] textarea");
      await captureAfter(evidence, page, realInputId("25b-insert-after-figure-" + name),
        "Edit mode on; the + after the final figure opened an empty editor below it.");
      await typeText(page, "After the figure.");
      await withCurrentFrame(page, (frame) => frame.locator(DONE).click());
      const expected = "# Figures\n\n" + figure + "\n\nAfter the figure.\n";
      try {
        await waitFor("the paragraph to be inserted after the figure", () =>
          bufferText(source).replace(/\n$/u, "") === expected.replace(/\n$/u, ""));
      } catch (error) {
        throw new Error(String(error) + " Buffer: " + JSON.stringify(bufferText(source)));
      }
      await waitForNoBlockEditor(page, "the block editor to close after Done");
    });
  }
}

/**
 * RI-T07: a plain image, an image inside a link and a raw `<img>` all open their block editor on a
 * click; ArrowUp from the paragraph below reaches the raw image; each image has a "+" after it.
 */
export async function scenarioImageEditing(page: Page, evidence: Evidence): Promise<void> {
  const text = "First paragraph.\n\n![a](img.png)\n\n[![b](img.png)](https://example.com)\n\n"
    + "<img src=\"img.png\" alt=\"c\">\n\nLast paragraph.\n";
  await withDocument("realinput-t07-images", text, async (source) => {
    await openStudioEditor(source.uri);
    await waitForRender(source);
    await setEditMode(page, true);
    const editorValue = async (): Promise<string | undefined> => {
      const current = await findCurrentFrame(page);
      if (current === undefined) return undefined;
      const textarea = current.locator("[data-sphinx-preview-block-editor] textarea");
      return await textarea.count() === 1 ? await textarea.inputValue() : undefined;
    };
    const images: Array<[string, string]> = [
      ["img[alt='a']", "![a](img.png)"],
      ["img[alt='b']", "[![b](img.png)](https://example.com)"],
      ["img[alt='c']", "<img src=\"img.png\" alt=\"c\">"],
    ];
    for (const [selector, source_] of images) {
      await withCurrentFrame(page, (frame) => frame.locator(selector).first().click({ force: true }));
      await waitFor("the editor for " + source_, async () => (await editorValue())?.trim() === source_);
      await escapeBlockEditor(page, "the editor to close after Escape");
      await withCurrentFrame(page, async (frame) => {
        const following = frame.locator(selector).first()
          .locator("xpath=ancestor-or-self::*[@data-sphinx-source-line][1]/following-sibling::*[1]");
        assert.ok((await following.getAttribute("class"))?.includes("sphinx-preview-insert-point"),
          "a + follows " + source_);
      });
    }
    await withCurrentFrame(page, (frame) => frame.locator("p", { hasText: "Last paragraph." }).click());
    await waitForEditor(page, "[data-sphinx-preview-block-editor] textarea");
    await press(page, "ArrowUp");
    await waitFor("the raw image editor after ArrowUp", async () =>
      (await editorValue())?.trim() === images[2][1]);
    await captureAfter(evidence, page, "block-editing/r04-arrow-up-into-image",
      "Edit mode on; ArrowUp from the last paragraph reached the raw <img> block editor.");
  });
}

/**
 * RI-T35: deleting the source shows the missing-source page with its title and message on two
 * lines; restoring the file brings the preview back.
 */
export async function scenarioStatusPageTwoLines(page: Page, evidence: Evidence): Promise<void> {
  await withSmokeDocument("realinput-t35", async (document) => {
    await openSidePreview(document);
    await waitForRender(document);
    // Let the file watcher see the file before it disappears, so the create and the delete are
    // not coalesced into nothing.
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    // The VS Code file service reports the deletion at once; a bare fs.rmSync waits for the
    // OS watcher, which does not reliably deliver events for the fixtures folder.
    await vscode.workspace.fs.delete(document.uri);
    const seen = new Set<string>();
    try {
      await waitFor("the missing-source page", () => {
        seen.add(String(getActivePreviewForTests()?.status));
        return getActivePreviewForTests()?.status === "missing-source";
      }, 20_000);
    } catch (error) {
      const active = getActivePreviewForTests();
      throw new Error(String(error) + " status=" + active?.status + " phase=" + active?.phase
        + " exists=" + fs.existsSync(document.uri.fsPath) + " seen=" + [...seen].join(","));
    }
    // A status page has no render markers, so findCurrentFrame cannot see it: find its frame by the
    // status-page marker on <body>.
    const statusFrame = async (): Promise<Frame | undefined> => {
      for (const frame of page.frames()) {
        try {
          if (await frame.locator("body[data-sphinx-preview-status-page]").count() === 1
            && await (await frame.frameElement()).isVisible()) return frame;
        } catch (error) {
          if (!/detached|destroyed|Target closed/iu.test(String(error))) throw error;
        }
      }
      return undefined;
    };
    let shown: Frame | undefined;
    await waitFor("the missing-source page to be visible", async () => {
      shown = await statusFrame();
      return shown !== undefined
        && await shown.locator('[data-sphinx-preview-status="missing-source"]').count() === 1;
    });
    assert.ok(shown);
    const text = await shown.locator("[data-sphinx-preview-status]").innerText();
    assert.ok(!text.includes("Sphinx"), "no Sphinx in the status page: " + text);
    assert.ok(/Preview source missing\s*\n+\s*\S/u.test(text),
      "title and message on two lines: " + JSON.stringify(text));
    await evidence.capture(page, shown, "lifecycle-sync/r07-status-page-missing-source",
      "Missing-source page: the title and the message sit on separate lines.",
      { checks: { required: ["status-two-lines"] } });
    await vscode.workspace.fs.writeFile(document.uri, Buffer.from(SMOKE, "utf8"));
    await waitFor("the preview to recover", async () => {
      const current = await findCurrentFrame(page);
      return current !== undefined && await current.locator("h1", { hasText: "Smoke document" }).count() === 1;
    });
  });
}
