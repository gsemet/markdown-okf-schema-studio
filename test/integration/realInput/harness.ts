import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { chromium, type Browser, type Frame, type Locator, type Page } from "playwright-core";
import * as vscode from "vscode";

import {
  COMMAND_ID,
  disposeActivePreviewForTests,
  EDITOR_VIEW_TYPE,
  getActivePreviewForTests,
} from "../extensionApi";
import { E2E_SCREENSHOT_ROOT } from "../../reportPaths";

export const MOD: "Meta" | "Control" = process.platform === "darwin" ? "Meta" : "Control";

const extensionRoot = path.resolve(__dirname, "../../../..");
const fixturesRoot = path.join(extensionRoot, "test", "integration", "fixtures");
const artifactsRoot = E2E_SCREENSHOT_ROOT;

/** Directories created by createFixture and not yet disposed. */
const liveFixtureDirectories = new Set<string>();

export async function connectWorkbench(): Promise<{ browser: Browser; page: Page }> {
  assert.ok(process.env.STUDIO_CDP_PORT, "the trusted suite must expose a loopback CDP port");
  const browser: Browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.STUDIO_CDP_PORT}`);
  const page = browser.contexts()[0]?.pages().find((candidate) => candidate.url().includes("workbench"));
  assert.ok(page, "the VS Code workbench is attached");
  return { browser, page };
}

/**
 * Matches the errors a webview replacement raises while a predicate or action uses the old frame.
 * "Cannot find context with specified id" is the CDP form of the same race, seen on a click.
 */
const detachedFrameError = /frame.*detach|execution context was destroyed|cannot find context with specified id/iu;

/**
 * Polls `predicate` until it returns true. A detached-frame error counts as false and polling
 * continues; any other error is rethrown.
 */
export async function waitFor(
  description: string,
  predicate: () => boolean | Promise<boolean>,
  timeoutMs = 10_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    let satisfied = false;
    try {
      satisfied = await predicate();
    } catch (error) {
      if (!detachedFrameError.test(String(error))) throw error;
    }
    if (satisfied) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`Timed out waiting for ${description}.`);
}

export function createFixture(prefix: string, files: Record<string, string>): {
  directory: string;
  path(relative: string): string;
  dispose(): void;
} {
  fs.mkdirSync(fixturesRoot, { recursive: true });
  const directory = fs.mkdtempSync(path.join(fixturesRoot, `${prefix}-`));
  liveFixtureDirectories.add(directory);
  for (const [relative, content] of Object.entries(files)) {
    const target = path.join(directory, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  return {
    directory,
    path: (relative: string) => path.join(directory, relative),
    dispose() {
      liveFixtureDirectories.delete(directory);
      fs.rmSync(directory, { recursive: true, force: true });
    },
  };
}

export async function openSidePreview(document: vscode.TextDocument): Promise<void> {
  await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
  await vscode.commands.executeCommand(COMMAND_ID);
}

export async function openStudioEditor(uri: vscode.Uri): Promise<void> {
  await vscode.commands.executeCommand("vscode.openWith", uri, EDITOR_VIEW_TYPE);
}

/** Full webview document assignments of the active preview so far (render-churn counter). */
export function htmlAssignmentCount(): number {
  const preview = getActivePreviewForTests();
  assert.ok(preview, "an active preview exists");
  return preview.htmlAssignments;
}

export async function waitForRender(
  document: vscode.TextDocument,
  extra?: (html: string) => boolean,
): Promise<void> {
  await waitFor("the preview to render the current document version", () => {
    const preview = getActivePreviewForTests();
    return preview?.documentUri === document.uri.toString()
      && preview.phase === "ready"
      && preview.documentVersion === document.version
      && (extra === undefined || extra(preview.html));
  });
}

/** The visible webview frame showing the host's current render, or undefined if none is ready. */
export async function findCurrentFrame(page: Page): Promise<Frame | undefined> {
  const preview = getActivePreviewForTests();
  if (preview === undefined) return undefined;
  for (const frame of page.frames()) {
    try {
      if (await frame.locator("#sphinx-myst-preview-content").count() === 0) continue;
      if (!await (await frame.frameElement()).isVisible()) continue;
      const root = frame.locator("html");
      // Requests and versions restart per webview, so a second visible Studio webview can carry the
      // same version and request id. The document id tells the two apart.
      if (await root.getAttribute("data-sphinx-preview-document-id") !== preview.documentUri) continue;
      if (await root.getAttribute("data-sphinx-preview-document-version") !== String(preview.documentVersion)) continue;
      if (await root.getAttribute("data-sphinx-preview-request-id") !== String(preview.requestId)) continue;
      return frame;
    } catch (error) {
      if (!detachedFrameError.test(String(error))) throw error;
    }
  }
  return undefined;
}

/** Waits until the current webview shows a raw-Markdown or table-cell editor matching `selector`. */
export async function waitForEditor(page: Page, selector: string): Promise<Frame> {
  await waitFor(`the editor matching ${selector}`, async () => {
    const frame = await findCurrentFrame(page);
    return frame !== undefined && await frame.locator(selector).count() === 1
      && await frame.locator(selector).isVisible();
  });
  return currentPreviewFrame(page);
}

/**
 * Moves the caret to the end of the focused textarea with a real key press. Chromium on macOS
 * ignores Meta+End (it stays at offset 0), so Meta+ArrowDown (end of document) is used there;
 * Control+End is used elsewhere. Neither key reaches block navigation, because boundaryNavigation
 * ignores events that carry metaKey or ctrlKey.
 */
export async function caretToEnd(page: Page): Promise<void> {
  await page.keyboard.press(process.platform === "darwin" ? "Meta+ArrowDown" : "Control+End");
}

/**
 * The selection of the focused textarea or input inside `frame`, or undefined when focus is
 * elsewhere. Read-only: it only inspects `document.activeElement`.
 */
export async function focusedCaret(
  frame: Frame,
): Promise<{ start: number; end: number; length: number } | undefined> {
  return frame.evaluate(() => {
    const element = document.activeElement;
    if (!(element instanceof HTMLTextAreaElement) && !(element instanceof HTMLInputElement)) {
      return undefined;
    }
    return {
      start: element.selectionStart ?? -1,
      end: element.selectionEnd ?? -1,
      length: element.value.length,
    };
  });
}

/** The visible webview frame showing exactly the host's current render. */
export async function currentPreviewFrame(page: Page): Promise<Frame> {
  let result: Frame | undefined;
  await waitFor("the rendered Studio webview", async () => {
    result = await findCurrentFrame(page);
    return result !== undefined;
  });
  assert.ok(result);
  return result;
}

/**
 * Runs an action against the current webview frame. The webview can be replaced while a render
 * settles, so a detached-frame error re-resolves the frame and retries. Any other error is final.
 * Only wrap actions that are safe or loud to repeat: if the frame detaches after the input was
 * dispatched, the action runs again.
 */
export async function withCurrentFrame<T>(
  page: Page,
  action: (frame: Frame) => Promise<T>,
  timeoutMs = 10_000,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const frame = await currentPreviewFrame(page);
    try {
      return await action(frame);
    } catch (error) {
      if (Date.now() >= deadline || !detachedFrameError.test(String(error))) {
        throw error;
      }
      await new Promise<void>((resolve) => setTimeout(resolve, 100));
    }
  }
}

/**
 * Clicks the edit toggle until the webview reports the wanted mode. A click can be lost while the
 * webview is still settling after a render, so each click gets a short wait before the next try.
 */
export async function setEditMode(page: Page, on: boolean): Promise<Frame> {
  const wanted = on ? "on" : "off";
  const maxClicks = 3;
  for (let click = 0; ; click += 1) {
    const mode = await withCurrentFrame(page, (frame) =>
      frame.locator("html").getAttribute("data-sphinx-preview-edit-mode"));
    if (mode === wanted) return currentPreviewFrame(page);
    if (click === maxClicks) throw new Error(`Edit mode did not switch to ${wanted} after ${maxClicks} clicks.`);
    await withCurrentFrame(page, (current) => current.locator("[data-sphinx-preview-edit-toggle]").click());
    try {
      await waitFor(`edit mode ${wanted}`, async () => {
        const current = await findCurrentFrame(page);
        return current !== undefined
          && await current.locator("html").getAttribute("data-sphinx-preview-edit-mode") === wanted;
      }, 1_500);
      return currentPreviewFrame(page);
    } catch {
      // The click was lost or not applied yet; re-check the mode and click again.
    }
  }
}

export async function blockEditor(frame: Frame): Promise<Locator> {
  return frame.locator("[data-sphinx-preview-block-editor] textarea");
}

export async function typeText(page: Page, text: string, delayMs?: number): Promise<void> {
  await page.keyboard.type(text, { delay: delayMs ?? 25 });
}

export async function press(page: Page, key: string): Promise<void> {
  await page.keyboard.press(key);
}

export function bufferText(document: vscode.TextDocument): string {
  return document.getText();
}

export function lines(text: string): string[] {
  return text.split("\n");
}

/** Options for the DOM geometry checks in test/shared/geometry-checks.js. */
export interface CaptureChecks {
  /** Check ids that must pass when applicable; a failing one fails the capture. */
  required?: string[];
  overlays?: string[];
  ignoreWithin?: string[];
}

interface MachineCheck {
  id: string;
  applicable: boolean;
  pass: boolean;
  detail: string;
}

const geometryChecksSource = fs.readFileSync(path.join(extensionRoot, "test", "shared", "geometry-checks.js"), "utf8");

export interface Evidence {
  directory: string;
  capture(page: Page, frame: Frame, name: string, note: string, options?: { checks?: CaptureChecks }): Promise<void>;
  finish(passed: boolean): void;
}

export function createEvidence(label: string): Evidence {
  fs.mkdirSync(artifactsRoot, { recursive: true });
  const directory = fs.mkdtempSync(path.join(artifactsRoot, `${label}-`));
  const startedAt = new Date().toISOString();
  const indexPath = path.join(directory, "INDEX.md");
  fs.writeFileSync(indexPath, `# ${label} capture order\n\nEntries follow execution order.\n\n`);
  const upper = label.toUpperCase();
  return {
    directory,
    /**
     * Writes `<name>.png` and `<name>.md` and appends the entry to INDEX.md. Call it only after the
     * scenario's last action: it scrolls the webview to the top, moves the pointer to the bottom-left
     * corner of the frame and blurs the toolbar buttons. Mid-scenario calls would disturb the scroll
     * anchor, hover states and anything below the first screen.
     */
    async capture(
      page: Page,
      frame: Frame,
      name: string,
      note: string,
      options?: { checks?: CaptureChecks },
    ): Promise<void> {
      await frame.evaluate(() => window.scrollTo(0, 0));
      const frameBounds = await (await frame.frameElement()).boundingBox();
      assert.ok(frameBounds);
      // Move the pointer away and blur the toolbar so no hover tooltip covers the content.
      await page.mouse.move(frameBounds.x + 4, frameBounds.y + frameBounds.height - 4);
      await frame.locator("[data-sphinx-preview-toolbar] button").evaluateAll((buttons) =>
        buttons.forEach((button) => (button as HTMLButtonElement).blur()));
      await frame.waitForFunction(() => Array.from(document.querySelectorAll("[data-sphinx-preview-toolbar] button[data-tooltip]"))
        .every((element) => {
          const tooltip = getComputedStyle(element, "::after");
          return tooltip.content === "none" || tooltip.content === "normal" || tooltip.visibility === "hidden"
            || Number(tooltip.opacity) === 0;
        }));
      const editMode = await frame.locator("html").getAttribute("data-sphinx-preview-edit-mode");
      const excerpt = bufferExcerpt();
      const checkOptions = options?.checks ?? {};
      let checkResult: { checks: MachineCheck[] } | undefined;
      let checkError: string | undefined;
      try {
        checkResult = await frame.evaluate(
          "(function(options){" + geometryChecksSource + "\nreturn studioGeometryChecks(options);})("
            + JSON.stringify({
              overlays: checkOptions.overlays,
              ignoreWithin: checkOptions.ignoreWithin,
            }) + ")",
        ) as { checks: MachineCheck[] };
      } catch (error) {
        checkError = error instanceof Error ? error.message : String(error);
      }
      const machineSection = "## Machine checks\n\n" + (checkResult
        ? checkResult.checks.map((check) =>
          `- ${!check.applicable ? "n/a" : check.pass ? "PASS" : "FAIL"} \`${check.id}\`: ${check.detail}`).join("\n")
          + "\n"
        : `- not run: ${checkError}\n`);
      await page.screenshot({ path: path.join(directory, `${name}.png`) });
      fs.writeFileSync(path.join(directory, `${name}.json`), JSON.stringify({
        summary: note,
        info: {
          id: name,
          suite: label,
          runId: process.env.STUDIO_E2E_RUN_ID ?? null,
          capturedAt: new Date().toISOString(),
          viewport: page.viewportSize(),
          host: "Real VS Code window; mouse and keyboard events dispatched through CDP",
        },
        capturedState: { editMode, bufferExcerpt: excerpt },
        checks: checkResult?.checks ?? [],
        failures: checkError ? [checkError] : (checkResult?.checks ?? [])
          .filter((check) => check.applicable && !check.pass).map((check) => check.detail),
        limitations: "Screenshot captures the final visible state; consult the suite manifest for the overall result.",
      }, null, 2) + "\n");
      fs.writeFileSync(path.join(directory, `${name}.md`), `# ${name}\n\n${note}\n\n`
        + `Edit mode: ${editMode}.\n\n`
        + "Real VS Code window; every action is a real mouse or keyboard event dispatched by Playwright "
        + "through CDP. Buffer excerpt at capture time:\n\n```markdown\n" + excerpt + "\n```\n\n"
        + machineSection);
      fs.appendFileSync(indexPath, `- [${name}](${name}.md): [image](${name}.png)\n`);
      const failedRequired = checkResult?.checks.find((check) =>
        check.applicable && !check.pass && (checkOptions.required ?? []).includes(check.id));
      if (failedRequired) {
        throw new Error(`Required machine check ${failedRequired.id} failed in ${name}: ${failedRequired.detail}`);
      }
      if (checkError !== undefined && (checkOptions.required ?? []).length > 0) {
        throw new Error(`Required machine checks did not run in ${name}: ${checkError}`);
      }
      console.log(`PASS real-input screenshot: ${name}`);
    },
    finish(passed: boolean): void {
      fs.writeFileSync(path.join(directory, "manifest.json"), JSON.stringify({
        runId: process.env.STUDIO_E2E_RUN_ID ?? null,
        campaignStartedAt: process.env.STUDIO_E2E_STARTED_AT ?? null,
        campaignCommand: process.env.STUDIO_E2E_COMMAND ?? null,
        startedAt,
        completedAt: new Date().toISOString(),
        status: passed ? "passed" : "failed",
      }, null, 2) + "\n");
      fs.writeFileSync(path.join(artifactsRoot, `${upper}-LATEST.md`),
        `# Latest ${label} Evidence\n\nSuite: **${passed ? "passed" : "failed"}**\n\n`
        + `Run identity: \`${process.env.STUDIO_E2E_RUN_ID ?? "unknown"}\`\n\n`
        + `[Ordered captures](${path.basename(directory)}/INDEX.md)\n`);
    },
  };
}

/** First lines of the live fixture document, for capture notes. */
function bufferExcerpt(): string {
  for (const document of vscode.workspace.textDocuments) {
    const fsPath = document.uri.fsPath;
    for (const directory of liveFixtureDirectories) {
      if (fsPath.startsWith(directory + path.sep)) return document.getText().split("\n").slice(0, 20).join("\n");
    }
  }
  return "(fixture document not open)";
}

export function writeSchema(directory: string, typeName: string, schemaYaml: string): void {
  const schemaDirectory = path.join(directory, "_schema");
  fs.mkdirSync(schemaDirectory, { recursive: true });
  fs.writeFileSync(path.join(schemaDirectory, `${typeName}.schema.yaml`), schemaYaml);
}

/**
 * Disposes the test preview, then closes every editor. Two facts matter for suites that run later:
 * `revertAndCloseActiveEditor` reverts whatever editor is active, which after a webview click is
 * usually none, so fixture buffers are not reverted explicitly. Dirty editors left by earlier suites
 * are closed too, and VS Code's extension-test mode answers "Don't Save", so no file changes on disk.
 */
export async function closeAllEditors(): Promise<void> {
  disposeActivePreviewForTests();
  if (vscode.window.activeTextEditor) {
    await vscode.commands.executeCommand("workbench.action.revertAndCloseActiveEditor");
  }
  await vscode.commands.executeCommand("workbench.action.closeAllEditors");
}
