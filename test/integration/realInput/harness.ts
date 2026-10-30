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
  previewGroupUnlocksSettledForTests,
} from "../extensionApi";
import { E2E_SCREENSHOT_ROOT } from "../../reportPaths";
import { injectToggleDelay } from "../../shared/tocLoop";
import { RealWindowEvidence } from "../evidence";

export const MOD: "Meta" | "Control" = process.platform === "darwin" ? "Meta" : "Control";

const extensionRoot = path.resolve(__dirname, "../../../..");
const fixturesRoot = path.join(extensionRoot, "test", "integration", "fixtures");
const artifactsRoot = E2E_SCREENSHOT_ROOT;

/** Directories created by createFixture and not yet disposed. */
const liveFixtureDirectories = new Set<string>();

export async function connectWorkbench(): Promise<{ browser: Browser; page: Page }> {
  assert.ok(process.env.STUDIO_CDP_PORT, "a real-window suite must expose a loopback CDP port (STUDIO_CDP_PORT)");
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

/** Moves the caret of the focused text box to the start of its text (the mirror of `caretToEnd`). */
export async function caretToStart(page: Page): Promise<void> {
  await page.keyboard.press(process.platform === "darwin" ? "Meta+ArrowUp" : "Control+Home");
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
  }).catch(async (error: unknown) => {
    const preview = getActivePreviewForTests();
    const frames = await Promise.all(page.frames().map(async (frame) => ({
      url: frame.url(), root: await frame.locator("html").evaluate((element) => ({
        version: element.getAttribute("data-sphinx-preview-document-version"),
        requestId: element.getAttribute("data-sphinx-preview-request-id"),
        documentId: element.getAttribute("data-sphinx-preview-document-id"),
      })).catch(() => undefined),
    })));
    throw new Error(`${String(error)} Expected preview: ${JSON.stringify({
      documentUri: preview?.documentUri, version: preview?.documentVersion, requestId: preview?.requestId,
    })}; frames: ${JSON.stringify(frames)}`);
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

const EDIT_TOGGLE = "[data-sphinx-preview-edit-toggle]";

/** What the page and its edit toggle held at one moment of {@link setEditMode}. */
interface EditToggleState {
  /** The render the frame shows (`requestId@version`). */
  render: string;
  /** `data-sphinx-preview-edit-mode` of `<html>`. */
  mode: string | null;
  toggle?: {
    dataEditMode: string | null;
    ariaPressed: string | null;
    ariaDisabled: string | null;
    visible: boolean;
    pointerEvents: string;
    box: string;
    /** The element at the toggle's centre in the webview, and whether it is (inside) the toggle. */
    hit: string;
    hitIsToggle: boolean;
  };
  /** The element at the toggle's centre in the workbench: the webview iframe unless something covers it. */
  workbenchHit?: string;
  focus: string;
  /** Clicks that reached the toggle in this frame since the probe was installed (counted at `document`, capture phase). */
  clicks: number;
  /** Uncaught errors of the frame since the probe was installed (the last five). */
  errors: string[];
}

/**
 * Reads the edit toggle state of `frame`. The first read installs a probe in the frame: a
 * capture-phase click counter on the toggle and an `error` listener. Both only record; neither
 * stops or changes an event.
 */
async function editToggleState(page: Page, frame: Frame): Promise<EditToggleState> {
  const state = await frame.evaluate((selector): EditToggleState => {
    type Probe = { clicks: number; errors: string[] };
    const scope = window as unknown as { studioEditToggleProbe?: Probe };
    let probe = scope.studioEditToggleProbe;
    if (probe === undefined) {
      const created: Probe = { clicks: 0, errors: [] };
      document.addEventListener("click", (event) => {
        if (event.target instanceof Element && event.target.closest(selector)) created.clicks += 1;
      }, true);
      window.addEventListener("error", (event) => {
        created.errors.push(String(event.message || event.error));
      });
      scope.studioEditToggleProbe = created;
      probe = created;
    }
    const describe = (element: Element | null): string => {
      if (element === null) return "none";
      const marks = Array.from(element.attributes)
        .filter((attribute) => attribute.name.startsWith("data-sphinx-preview") || attribute.name === "class")
        .slice(0, 3)
        .map((attribute) => `[${attribute.name}${attribute.value ? `=${attribute.value.slice(0, 40)}` : ""}]`);
      return `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""}${marks.join("")}`;
    };
    const root = document.documentElement;
    const button = document.querySelector<HTMLElement>(selector);
    let toggle: EditToggleState["toggle"];
    if (button !== null) {
      const rect = button.getBoundingClientRect();
      const style = getComputedStyle(button);
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      toggle = {
        dataEditMode: button.getAttribute("data-edit-mode"),
        ariaPressed: button.getAttribute("aria-pressed"),
        ariaDisabled: button.getAttribute("aria-disabled"),
        visible: rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none",
        pointerEvents: style.pointerEvents,
        box: [rect.left, rect.top, rect.width, rect.height].map((value) => Math.round(value)).join(","),
        hit: describe(hit),
        hitIsToggle: hit !== null && button.contains(hit),
      };
    }
    return {
      render: `${root.getAttribute("data-sphinx-preview-request-id")}@${root.getAttribute("data-sphinx-preview-document-version")}`,
      mode: root.getAttribute("data-sphinx-preview-edit-mode"),
      toggle,
      focus: describe(document.activeElement),
      clicks: probe.clicks,
      errors: probe.errors.slice(-5),
    };
  }, EDIT_TOGGLE);
  if (state.toggle !== undefined) {
    // Diagnostic only: a short, non-fatal read, so a toggle that disappears (a document load in the
    // same frame) never turns this read into the failure and the state above is always recorded.
    const box = await frame.locator(EDIT_TOGGLE).boundingBox({ timeout: 250 }).catch(() => null);
    state.workbenchHit = box === null ? "unreadable" : await page.evaluate(([x, y]) => {
      const element = document.elementFromPoint(x, y);
      if (element === null) return "none";
      const classes = typeof element.className === "string" ? element.className.trim().split(/\s+/u).filter(Boolean) : [];
      return `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""}${classes.map((name) => `.${name}`).join("")}`;
    }, [box.x + box.width / 2, box.y + box.height / 2] as const).catch(() => "unreadable");
  }
  return state;
}

/**
 * Waits until the current frame's page runtime has booted: `data-sphinx-preview-edit-mode` is set
 * at runtime by `initializeContent`, after the edit toggle's click handler is bound, and no server
 * HTML carries it. Before that, a click on the toggle reaches no handler.
 */
async function waitForEditModeRuntime(page: Page): Promise<void> {
  let last = "no current frame";
  try {
    await waitFor("the page runtime to set its edit mode", async () => {
      const frame = await findCurrentFrame(page);
      if (frame === undefined) {
        last = "no current frame";
        return false;
      }
      const mode = await frame.locator("html").getAttribute("data-sphinx-preview-edit-mode");
      last = `mode ${String(mode)}, webviewReady ${String(getActivePreviewForTests()?.webviewReady)}`;
      return mode !== null;
    });
  } catch (error) {
    throw new Error(`${String(error)} Last read: ${last}`);
  }
}

/**
 * Clicks the edit toggle until the current render reports the wanted mode. It first waits until
 * the page runtime has booted (the edit mode attribute is set), and never clicks a page that has
 * not. Before each click the toggle must be present and enabled; its state (attributes, box, the
 * element at its centre in the webview and in the workbench, focus) is recorded. After the click
 * the outcome is read on the frame that was clicked:
 * - the frame was replaced, or the click never reached the toggle in the page (the capture-phase
 *   counter did not move): the click was lost, and only then the next attempt clicks again;
 * - the click reached the toggle in the page but the page did not report the wanted mode, or the
 *   next render brought the old mode back: the page misbehaved, and the helper fails at once. The
 *   counter does not prove that the toggle's own listener ran (a listener between the document
 *   and the toggle could stop the event); `errors` shows a throw in the page.
 * Every failure message carries the recorded state of each attempt.
 */
export async function setEditMode(page: Page, on: boolean): Promise<Frame> {
  const wanted = on ? "on" : "off";
  const maxClicks = 3;
  const maxBootWaits = 3;
  const attempts: string[] = [];
  const failure = (reason: string): Error => new Error(
    `Edit mode did not switch to ${wanted}: ${reason}. Attempts: ${attempts.join(" | ") || "none"}`);
  let bootWaits = 0;
  for (let click = 1; click <= maxClicks; click += 1) {
    await waitForEditModeRuntime(page);
    // One action on one frame: read the state, then click. When the frame is replaced during the
    // action, withCurrentFrame runs it again on the new frame, which reads the state first. A new
    // frame whose runtime has not booted yet (mode null) is not clicked.
    const before = await withCurrentFrame(page, async (frame) => {
      let state = await editToggleState(page, frame);
      const canClick = (candidate: EditToggleState): boolean => candidate.mode !== null && candidate.mode !== wanted
        && candidate.toggle !== undefined && candidate.toggle.ariaDisabled !== "true";
      let unclicked: string | undefined;
      let injectedBefore = 0;
      let injectedAfter = 0;
      if (canClick(state)) {
        // Repro loop only (STUDIO_TOGGLE_DELAY_MS): a pause between the state read and the click.
        injectedBefore = await injectToggleDelay();
        if (injectedBefore > 0) {
          // The page may have changed during the pause. A render restoring the mode with no click
          // is the evidence the repro looks for: read the state again, right before the click, and
          // record the change apart from anything the click does.
          const reread = await editToggleState(page, frame);
          if (reread.mode !== state.mode || reread.render !== state.render) {
            unclicked = `mode ${String(state.mode)} -> ${String(reread.mode)}, render ${state.render} -> ${reread.render}`;
          }
          state = reread;
        }
        if (canClick(state)) {
          await frame.locator(EDIT_TOGGLE).click();
          injectedAfter = await injectToggleDelay();
        }
      }
      return { frame, state, unclicked, injectedBefore, injectedAfter };
    });
    if (before.state.mode === null) {
      // Not clicked and not counted: a replacement frame has not booted yet. Wait for it again.
      bootWaits += 1;
      attempts.push(`#${click} not clicked, the page runtime has not booted: ${JSON.stringify(before.state)}`);
      if (bootWaits > maxBootWaits) throw failure(`the current frame was replaced by an unbooted page ${bootWaits} times`);
      click -= 1;
      continue;
    }
    // In order: the state the click was made on, then what the injected pauses did around it.
    attempts.push(`#${click} before ${JSON.stringify(before.state)}`);
    if (before.injectedBefore > 0) attempts.push(`#${click} injected ${before.injectedBefore} ms before the click`);
    if (before.unclicked !== undefined) {
      attempts.push(`#${click} CHANGED WITH NO CLICK during the injected pause: ${before.unclicked}`);
    }
    if (before.injectedAfter > 0) attempts.push(`#${click} injected ${before.injectedAfter} ms after the click`);
    if (before.state.mode === wanted) {
      if (before.unclicked !== undefined) console.log(`setEditMode ${wanted}: reached with no click. Attempts: ${attempts.join(" | ")}`);
      return currentPreviewFrame(page);
    }
    if (before.state.toggle === undefined) throw failure("the page has no edit toggle");
    if (before.state.toggle.ariaDisabled === "true") throw failure("the edit toggle is disabled (read-only preview)");
    // The outcome, read on the clicked frame: the page handles the click in the same task as the
    // probe's counter, so a counted click comes with the page's answer to it.
    // Assigned in the poll below (`as` keeps TypeScript from narrowing them to their start values).
    let after = undefined as EditToggleState | undefined;
    let replaced = false as boolean;
    try {
      await waitFor("the click to reach the edit toggle", async () => {
        if (before.frame.isDetached()) {
          replaced = true;
          return true;
        }
        after = await editToggleState(page, before.frame);
        return after.clicks > before.state.clicks;
      }, 1_500);
    } catch (error) {
      // Not reached in time: recorded below as a lost click. Any other error is final.
      if (!String(error).includes("Timed out waiting for the click to reach the edit toggle")) throw error;
    }
    if (replaced || after === undefined) {
      attempts.push(`#${click} lost: the clicked frame was replaced`);
      continue;
    }
    if (after.clicks === before.state.clicks) {
      attempts.push(`#${click} lost: the click never reached the toggle in the page; after ${JSON.stringify(after)}`);
      continue;
    }
    attempts.push(`#${click} reached the toggle; after ${JSON.stringify(after)}`);
    if (after.mode !== wanted) {
      const earlier = before.unclicked === undefined ? ""
        : `the page changed with no click during the injected pause (${before.unclicked}), then `;
      throw failure(`${earlier}click #${click} reached the toggle in the page and the page shows mode ${after.mode} `
        + `(it showed ${before.state.mode} before the click)`);
    }
    try {
      await waitFor(`the current render to keep edit mode ${wanted}`, async () => {
        const current = await findCurrentFrame(page);
        return current !== undefined
          && await current.locator("html").getAttribute("data-sphinx-preview-edit-mode") === wanted;
      });
    } catch {
      const current = await findCurrentFrame(page).catch(() => undefined);
      const now = current === undefined
        ? "no current frame"
        : await editToggleState(page, current).then((state) => JSON.stringify(state), (error: unknown) => String(error));
      throw failure(`the page switched to ${wanted} on click #${click}, then the current render shows ${now}`);
    }
    if (click > 1) console.log(`setEditMode ${wanted}: switched on click #${click}. Attempts: ${attempts.join(" | ")}`);
    return currentPreviewFrame(page);
  }
  throw failure(`the toggle missed ${maxClicks} clicks`);
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
  /** `id` is a `<group>/rNN-<slug>` id of the capture registry; unknown ids throw. */
  capture(page: Page, frame: Frame, id: string, note: string, options?: { checks?: CaptureChecks }): Promise<void>;
  /** `complete`: the whole suite ran, so every registered capture of it must have been taken. */
  finish(passed: boolean, complete?: boolean): void;
}

/** The suites that write through this capture helper; each has its own `<LABEL>-LATEST.md` pointer. */
export type EvidenceLabel = "real-input" | "untrusted";

export function createEvidence(label: EvidenceLabel): Evidence {
  const store = new RealWindowEvidence(label, { indexTitle: `${label} capture order` });
  const directory = store.directory;
  const upper = label.toUpperCase();
  return {
    directory,
    /**
     * Writes `<group>/<rNN-slug>.png` (unless the entry is assertion-only), `.md` and `.json` and
     * registers the capture in the run manifest. Call it only after the scenario's last action: it
     * scrolls the webview to the top, moves the pointer to the bottom-left corner of the frame and
     * blurs the toolbar buttons. Mid-scenario calls would disturb the scroll anchor, hover states
     * and anything below the first screen.
     */
    async capture(
      page: Page,
      frame: Frame,
      id: string,
      note: string,
      options?: { checks?: CaptureChecks },
    ): Promise<void> {
      store.paths(id); // unknown ids fail before any action on the page
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
      await store.shoot(page, frame, id);
      store.record(id, {
        note,
        json: {
          summary: note,
          info: {
            viewport: page.viewportSize(),
            host: "Real VS Code window; mouse and keyboard events dispatched through CDP",
          },
          capturedState: { editMode, bufferExcerpt: excerpt },
          checks: checkResult?.checks ?? [],
          failures: checkError ? [checkError] : (checkResult?.checks ?? [])
            .filter((check) => check.applicable && !check.pass).map((check) => check.detail),
          limitations: "Screenshot captures the final visible state; consult the suite manifest for the overall result.",
        },
        markdown: `Edit mode: ${editMode}.\n\n`
          + "Real VS Code window; every action is a real mouse or keyboard event dispatched by Playwright "
          + "through CDP. Buffer excerpt at capture time:\n\n```markdown\n" + excerpt + "\n```\n\n"
          + machineSection,
      });
      const failedRequired = checkResult?.checks.find((check) =>
        check.applicable && !check.pass && (checkOptions.required ?? []).includes(check.id));
      if (failedRequired) {
        throw new Error(`Required machine check ${failedRequired.id} failed in ${id}: ${failedRequired.detail}`);
      }
      if (checkError !== undefined && (checkOptions.required ?? []).length > 0) {
        throw new Error(`Required machine checks did not run in ${id}: ${checkError}`);
      }
      console.log(`PASS ${label} screenshot: ${id}`);
    },
    finish(passed: boolean, complete = false): void {
      const missing = passed && complete ? store.missing() : [];
      const status = passed && missing.length === 0 ? "passed" : "failed";
      store.writeManifest({
        runId: process.env.STUDIO_E2E_RUN_ID ?? null,
        campaignStartedAt: process.env.STUDIO_E2E_STARTED_AT ?? null,
        campaignCommand: process.env.STUDIO_E2E_COMMAND ?? null,
        startedAt: store.startedAt,
        completedAt: new Date().toISOString(),
        status,
        ...(missing.length > 0 ? { missingCaptures: missing } : {}),
      });
      fs.writeFileSync(path.join(artifactsRoot, `${upper}-LATEST.md`),
        `# Latest ${label} Evidence\n\nSuite: **${status}**\n\n`
        + `Run identity: \`${process.env.STUDIO_E2E_RUN_ID ?? "unknown"}\`\n\n`
        + `[Ordered captures](${path.basename(directory)}/INDEX.md)\n`);
      if (missing.length > 0) store.assertComplete();
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
 * Disposes the test preview, then closes every editor, then waits until the group unlock of every
 * closed preview has finished. That unlock runs focus commands for up to about 1.7 s after the
 * close; a preview the next scenario opened meanwhile lost the focus to it (CI run 39945708423,
 * stress `table-tab`: `panelActive` false, page blur, the caret never came back). Two facts matter
 * for suites that run later:
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
  await previewGroupUnlocksSettledForTests();
}
