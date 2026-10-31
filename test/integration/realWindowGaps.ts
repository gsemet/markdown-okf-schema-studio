/**
 * Real-window gap fill of the e2e campaign (CR 043, P9 T2): behaviour that had assertions only
 * (message-level integration tests) or no real-window evidence at all now runs in a real VS Code
 * window with real mouse and keyboard events, and leaves a registered capture.
 *
 * Every wait here is on a state the host or the page reports (a test hook of the extension, a page
 * attribute, the file on disk, the workbench DOM), never on time. Each scenario is in the stress
 * plan (`test/shared/stressPlan.ts`, CI rule 12), so it must leave the window as it found it: no
 * open editor, edit mode off and remembered off, settings restored, temporary files removed.
 */
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import type { Frame, Locator, Page } from "playwright-core";
import * as vscode from "vscode";
import { describeFolder } from "./folderListing";
import { explained, selectAllInControl } from "./realInput/flushBeforeNavigate";
import { interruptionSince, type PageWitness, type StepVerdict, type TraceEntry, type WindowState } from "../shared/stepInterruption";

import {
  disposeActivePreviewForTests,
  getActivePreviewForTests,
  storedEditModeForTests,
} from "./extensionApi";
import {
  bufferText,
  closeAllEditors,
  createFixture,
  currentPreviewFrame,
  findCurrentFrame,
  MOD,
  openSidePreview,
  press,
  setEditMode,
  typeText,
  waitFor,
  waitForEditor,
  waitForRender,
  withCurrentFrame,
  type Evidence,
} from "./realInput/harness";

const extensionRoot = path.resolve(__dirname, "../../..");

/** Tracked fixture: its committed text is the Git HEAD baseline of the incoming-change marks. */
export const INCOMING_FIXTURE = path.join(extensionRoot, "test", "integration", "fixtures", "incoming-changes.md");

async function captureNow(evidence: Evidence, page: Page, id: string, note: string): Promise<void> {
  await withCurrentFrame(page, (frame) => evidence.capture(page, frame, id, note));
}

/** Edit mode off in the page, and the workspace remembers it off for the next preview. */
async function leaveEditMode(page: Page): Promise<void> {
  if (await findCurrentFrame(page) !== undefined) await setEditMode(page, false);
  await waitFor("the workspace to remember edit mode off", () => storedEditModeForTests() !== true);
}

/** The ready preview of `document`, with the page loaded for its current render. */
async function waitForPreviewReady(document: vscode.TextDocument, timeoutMs = 10_000): Promise<void> {
  await waitFor(`the preview of ${path.basename(document.uri.fsPath)} to be ready`, () => {
    const preview = getActivePreviewForTests();
    return preview?.documentUri === document.uri.toString() && preview.phase === "ready"
      && preview.webviewReady && preview.documentVersion === document.version;
  }, timeoutMs);
}

async function withFixtureDocument(
  prefix: string,
  files: Record<string, string>,
  main: string,
  body: (document: vscode.TextDocument, directory: string) => Promise<void>,
): Promise<void> {
  const fixture = createFixture(prefix, files);
  try {
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(fixture.path(main)));
    try {
      await body(document, fixture.directory);
    } finally {
      await closeAllEditors();
    }
  } finally {
    fixture.dispose();
  }
}

interface GitRepositoryState {
  state: { HEAD?: { commit?: string } };
}

/** The repository the built-in Git extension holds for `uri`, once it reports a HEAD commit. */
async function waitForGitRepository(uri: vscode.Uri): Promise<void> {
  const extension = vscode.extensions.getExtension<{ getAPI(version: 1): { getRepository(uri: vscode.Uri): GitRepositoryState | null } }>("vscode.git");
  assert.ok(extension, "the built-in Git extension is present in the test host");
  const api = (await extension.activate()).getAPI(1);
  await waitFor("the Git extension to open the repository of the fixture", () =>
    api.getRepository(uri)?.state.HEAD?.commit !== undefined, 30_000);
}

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-006
// @tests_req SwRS-MDOKFSTUDIO-REVIEW-008
// @tests_req SwRS-MDOKFSTUDIO-REVIEW-009
/**
 * CR 147: the Side-by-side button turns each changed block into a card with the block at HEAD on the
 * left and the current block on the right. Runs on the buffer of {@link scenarioIncomingChanges}
 * (one paragraph edited, one added, never saved) and removes one more block from it.
 */
async function sideBySideSteps(
  page: Page,
  evidence: Evidence,
  document: vscode.TextDocument,
  committed: string,
): Promise<void> {
  const cards = (frame: Frame): Locator => frame.locator("[data-okf-sbs-card]");
  await withCurrentFrame(page, async (frame) => {
    assert.equal(await frame.locator("html").getAttribute("data-sphinx-preview-sbs"), "off", "the diff is off by default");
    assert.equal(await cards(frame).count(), 0, "the default shows the green bars only");
    await frame.locator("[data-sphinx-preview-sbs-toggle]").click();
  });
  await waitFor("the side-by-side cards of the two changed blocks", () => withCurrentFrame(page, async (frame) =>
    await cards(frame).count() === 2));
  await withCurrentFrame(page, async (frame) => {
    assert.equal(await frame.locator("[data-sphinx-preview-sbs-toggle]").getAttribute("aria-pressed"), "true");
    const changed = cards(frame).filter({ hasText: "will change in the buffer" });
    assert.equal(await changed.count(), 1, "the edited paragraph is one card");
    assert.match(await changed.locator("[data-okf-sbs-side=base]").innerText(), /will change in the buffer\./u);
    assert.match(await changed.locator("[data-okf-sbs-side=current]").innerText(), /changed in the buffer and is not saved/u);
    assert.ok(await changed.locator("[data-okf-sbs-side=base] [data-okf-sbs-word=removed]").count() > 0, "removed words on the left");
    assert.ok(await changed.locator("[data-okf-sbs-side=current] [data-okf-sbs-word=added]").count() > 0, "added words on the right");
    const added = cards(frame).filter({ hasText: "added after the commit" });
    assert.equal(await added.count(), 1, "the added paragraph is one card");
    assert.equal((await added.locator("[data-okf-sbs-side=base]").innerText()).replace(/last commit/iu, "").trim(), "", "empty left side");
    assert.equal(await frame.locator("[data-okf-sbs-card]", { hasText: "stays as committed" }).count(), 0, "an unchanged block has no card");
    assert.equal(await frame.getByText("stays as committed").first().isVisible(), true, "and stays as it is");
    assert.equal(await frame.locator("[data-okf-sbs-replaced]").count(), 2, "the two original blocks are replaced");
    for (const original of await frame.locator("[data-okf-sbs-replaced]").all()) {
      assert.equal(await original.isVisible(), false, "an original block is hidden while its card shows");
    }
  });
  await captureNow(evidence, page, "review-annotations/r07-side-by-side-diff",
    "Reading mode; the same unsaved buffer as r03 with the Side-by-side button pressed. The edited paragraph "
    + "is a card (HEAD left, buffer right, removed and added words marked), the added paragraph a card with an "
    + "empty left side; the unchanged blocks are as they were.");

  // A whole block removed in the buffer comes back on the left with an empty right side.
  const removedLine = document.getText().split("\n").findIndex((line) => line.startsWith("This paragraph stays as committed"));
  assert.ok(removedLine > 0, "the fixture holds the paragraph to remove");
  const edit = new vscode.WorkspaceEdit();
  edit.delete(vscode.Uri.file(INCOMING_FIXTURE), new vscode.Range(removedLine, 0, removedLine + 2, 0));
  assert.equal(await vscode.workspace.applyEdit(edit), true);
  await waitFor("the card of the removed block", () => withCurrentFrame(page, async (frame) =>
    await cards(frame).filter({ hasText: "stays as committed" }).count() === 1));
  await withCurrentFrame(page, async (frame) => {
    const removed = cards(frame).filter({ hasText: "stays as committed" });
    assert.match(await removed.locator("[data-okf-sbs-side=base]").innerText(), /stays as committed/u);
    assert.equal((await removed.locator("[data-okf-sbs-side=current]").innerText()).replace(/now/iu, "").trim(), "", "empty right side");
  });

  // Edit mode: the button is disabled, no card shows and the green bars remain.
  await setEditMode(page, true);
  await withCurrentFrame(page, async (frame) => {
    assert.equal(await frame.locator("[data-sphinx-preview-sbs-toggle]").isDisabled(), true);
    assert.equal(await frame.locator("[data-okf-sbs-card]:visible").count(), 0, "no card in edit mode");
    assert.ok(await frame.locator("[data-sphinx-preview-changed]").count() >= 2, "the green bars remain");
  });
  await leaveEditMode(page);
  await waitFor("the cards back after edit mode", () => withCurrentFrame(page, async (frame) =>
    await frame.locator("[data-okf-sbs-card]:visible").count() === 3));

  // Off: the originals are back and nothing is left of the cards.
  await withCurrentFrame(page, async (frame) => {
    await frame.locator("[data-sphinx-preview-sbs-toggle]").click();
  });
  await withCurrentFrame(page, async (frame) => {
    assert.equal(await frame.locator("html").getAttribute("data-sphinx-preview-sbs"), "off");
    assert.equal(await frame.locator("[data-okf-sbs-card]").count(), 0);
    assert.equal(await frame.locator("[data-okf-sbs-replaced]").count(), 0);
  });
  assert.equal(fs.readFileSync(INCOMING_FIXTURE, "utf8"), committed, "the source file is never rewritten");
}

// @tests_req StRS-MDOKFSTUDIO-REVIEW-017
/**
 * review-annotations/r03: a tracked file whose buffer differs from Git HEAD. The buffer is edited,
 * never saved, and reverted at the end, so the working tree does not change.
 */
export async function scenarioIncomingChanges(page: Page, evidence: Evidence): Promise<void> {
  const uri = vscode.Uri.file(INCOMING_FIXTURE);
  const committed = fs.readFileSync(INCOMING_FIXTURE, "utf8");
  await waitForGitRepository(uri);
  const document = await vscode.workspace.openTextDocument(uri);
  try {
    assert.equal(document.getText(), committed, "the fixture starts as committed");
    const editedLine = document.getText().split("\n").findIndex((line) => line.startsWith("This paragraph will change"));
    assert.ok(editedLine > 0, "the fixture holds the paragraph to edit");
    const edit = new vscode.WorkspaceEdit();
    edit.replace(uri, document.lineAt(editedLine).range, "This paragraph changed in the buffer and is not saved.");
    edit.insert(uri, new vscode.Position(document.lineCount - 1, 0), "\nA paragraph added after the commit.\n");
    assert.equal(await vscode.workspace.applyEdit(edit), true);
    await openSidePreview(document);
    await waitForPreviewReady(document);
    // The toggle is disabled in edit mode, which an earlier scenario may have left on.
    await leaveEditMode(page);
    await waitFor("the host to mark the changed lines", () => {
      const last = getActivePreviewForTests()?.incomingChanges.last;
      return last?.enabled === true && last.ranges.length >= 2;
    }, 20_000);
    await waitFor("the change bars in the page", () => withCurrentFrame(page, async (frame) =>
      await frame.locator("[data-sphinx-preview-changed]").count() >= 2
      && await frame.locator("[data-sphinx-preview-change-layer] > *").count() >= 2));
    await withCurrentFrame(page, async (frame) => {
      const marked = await frame.locator("[data-sphinx-preview-changed]").allTextContents();
      assert.ok(marked.some((text) => text.includes("changed in the buffer")), `edited paragraph marked: ${JSON.stringify(marked)}`);
      assert.ok(marked.some((text) => text.includes("added after the commit")), `added paragraph marked: ${JSON.stringify(marked)}`);
      assert.ok(!marked.some((text) => text.includes("stays as committed")), "an unchanged paragraph carries no mark");
    });
    await captureNow(evidence, page, "review-annotations/r03-incoming-change-bars",
      "Reading mode; the buffer of a tracked fixture differs from Git HEAD (one paragraph edited, one "
      + "added, not saved). Both blocks carry the green change bar; the unchanged blocks do not.");
    await sideBySideSteps(page, evidence, document, committed);
  } finally {
    disposeActivePreviewForTests();
    await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
    await vscode.commands.executeCommand("workbench.action.files.revert");
    await waitFor("the fixture buffer to be reverted", () => !document.isDirty && document.getText() === committed);
    await closeAllEditors();
  }
}

/** Position of the middle of `word` inside the first paragraph containing it, relative to that paragraph. */
async function wordPosition(page: Page, word: string): Promise<{ x: number; y: number }> {
  return withCurrentFrame(page, (frame) => frame.evaluate((needle) => {
    const paragraph = Array.from(document.querySelectorAll("p")).find((element) => element.textContent?.includes(needle));
    if (!paragraph) throw new Error(`no paragraph holds ${needle}`);
    const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const at = node.nodeValue?.indexOf(needle) ?? -1;
      if (at < 0) continue;
      const range = document.createRange();
      range.setStart(node, at);
      range.setEnd(node, at + needle.length);
      const box = range.getBoundingClientRect();
      const outer = paragraph.getBoundingClientRect();
      return { x: box.left - outer.left + box.width / 2, y: box.top - outer.top + box.height / 2 };
    }
    throw new Error(`${needle} is not inside one text node`);
  }, word));
}

interface SidecarThread {
  resolved: boolean;
  anchor: { quote: string };
  comments: Array<{ author: string; body: string }>;
}

function readThreads(file: string): SidecarThread[] {
  if (!fs.existsSync(file)) return [];
  try {
    return (JSON.parse(fs.readFileSync(file, "utf8")) as { threads: SidecarThread[] }).threads;
  } catch {
    return []; // the host writes the file whole; a half-read file is just "not yet"
  }
}

/** The host's comment and page-load counters, taken before a step so a failure shows what changed. */
function threadCounters(): { pageLoads?: number; contentPatches?: number; commentPosts?: number } {
  const preview = getActivePreviewForTests();
  return { pageLoads: preview?.htmlAssignments, contentPatches: preview?.contentPatches, commentPosts: preview?.comments.posts };
}

/**
 * What the sidecar, the host and the page hold for the review threads, for a failure message (CI
 * rule 12): the counters before the step and now (a page load replaces the page and its popover),
 * the threads the host posted last and its last answer, and the popover, marks, comment box and
 * focus of the page. Read with `evaluate`, which never waits for an element.
 */
async function reviewThreadState(
  page: Page,
  sidecar: string,
  before: ReturnType<typeof threadCounters>,
  start?: StepStart,
  verdict?: StepVerdict,
): Promise<string> {
  const preview = getActivePreviewForTests();
  const host = JSON.stringify({
    before,
    now: threadCounters(),
    requestId: preview?.requestId,
    windowState: { focused: vscode.window.state.focused, active: vscode.window.state.active },
    stepStart: start === undefined ? undefined : {
      page: start.page, pageLoads: start.pageLoads, at: start.at, windowStates: start.windowStates,
    },
    verdict,
    posted: preview?.comments.last?.map((thread) => ({
      id: thread.id, resolved: thread.resolved, comments: thread.comments.length, orphaned: thread.orphaned,
    })),
    result: preview?.comments.result,
  });
  let shown: string;
  try {
    const frame = await findCurrentFrame(page);
    shown = frame === undefined ? "no current frame" : JSON.stringify(await frame.evaluate(() => {
      const doc = window.document;
      const attributes = (element: Element): string =>
        Array.from(element.attributes, (attribute) => `${attribute.name}=${attribute.value}`).join(" ");
      const popovers = Array.from(doc.querySelectorAll("[data-okf-comment-popover]"));
      const active = doc.activeElement;
      return {
        requestId: doc.documentElement.getAttribute("data-sphinx-preview-request-id"),
        startedAt: (window as unknown as { __studioDiagnostics?: { startedAt?: () => number } }).__studioDiagnostics?.startedAt?.(),
        pageFocus: doc.hasFocus(),
        visibility: doc.visibilityState,
        popovers: popovers.map((popover) => ({
          attributes: attributes(popover),
          actions: popover.querySelector("[data-okf-comment-thread-actions]")?.outerHTML.slice(0, 600) ?? "none",
          text: (popover.textContent ?? "").slice(0, 300),
        })),
        marks: Array.from(doc.querySelectorAll("mark[data-okf-comment-thread]"), attributes),
        composeBoxes: doc.querySelectorAll("[data-okf-comment-compose]").length,
        active: active ? `${active.tagName.toLowerCase()} ${attributes(active)}` : "none",
      };
    }));
  } catch (error) {
    shown = `unreadable (${String(error)})`;
  }
  const threads = readThreads(sidecar).map((thread) => ({ resolved: thread.resolved, comments: thread.comments.length }));
  return `sidecar ${JSON.stringify(threads)}; host ${host}; page ${shown}`;
}

/** The trace event of commentThreads.ts that names why an open thread popover closed. */
const POPOVER_CLOSED = "comment popover closed";

/** What the page reports now and its trace (see stepInterruption.ts); undefined when no page is shown. */
async function readPageWitness(page: Page): Promise<{ witness: PageWitness; trace: TraceEntry[] } | undefined> {
  try {
    const frame = await findCurrentFrame(page);
    return frame === undefined ? undefined : await frame.evaluate(() => {
      const diagnostics = (window as unknown as {
        __studioDiagnostics?: { trace(): Array<{ at: number; event: string; detail?: string }>; startedAt?: () => number };
      }).__studioDiagnostics;
      const startedAt = diagnostics?.startedAt?.() ?? null;
      return {
        witness: {
          startedAt,
          clock: startedAt === null ? null : Date.now() - startedAt,
          requestId: window.document.documentElement.getAttribute("data-sphinx-preview-request-id"),
          pageFocus: window.document.hasFocus(),
        },
        trace: diagnostics ? diagnostics.trace() : [],
      };
    });
  } catch {
    return undefined; // a page going away while read: nothing is proved
  }
}

/**
 * What the page and the host held when a step started (`at`: host `Date.now()`), and the focus
 * changes of the VS Code window since then (`onDidChangeWindowState`, host time). A step the page
 * cannot witness can only fail.
 */
interface StepStart {
  at: number;
  page: PageWitness | undefined;
  pageLoads: number | undefined;
  windowStates: WindowState[];
  dispose(): void;
}

/** Starts witnessing a step; `started` collects it so the scenario stops every window listener. */
async function stepStart(page: Page, started: StepStart[]): Promise<StepStart> {
  const at = Date.now();
  const windowStates: WindowState[] = [];
  const subscription = vscode.window.onDidChangeWindowState((state) => {
    windowStates.push({ at: Date.now(), focused: state.focused });
  });
  const start: StepStart = {
    at,
    page: (await readPageWitness(page))?.witness,
    pageLoads: threadCounters().pageLoads,
    windowStates,
    dispose: () => subscription.dispose(),
  };
  started.push(start);
  return start;
}

/** The single thread popover of the page as it shows it, or null when there is not exactly one. */
async function threadPopover(page: Page): Promise<{ entries: number; action?: string; actionEnabled: boolean; reply?: string } | null> {
  return withCurrentFrame(page, (frame) => frame.evaluate(() => {
    const popovers = window.document.querySelectorAll("[data-okf-comment-popover]");
    if (popovers.length !== 1) return null;
    const popover = popovers[0]!;
    const action = popover.querySelector("[data-okf-comment-resolve]");
    const reply = popover.querySelector<HTMLTextAreaElement>("[data-okf-comment-reply-input]");
    return {
      entries: popover.querySelectorAll("[data-okf-comment-entry]").length,
      action: action?.textContent?.trim(),
      actionEnabled: action !== null && !action.hasAttribute("disabled"),
      reply: reply?.value,
    };
  }));
}

/** Opens the popover of the (single) highlighted quote with a click, unless one is open. */
async function reopenThreadPopover(page: Page): Promise<void> {
  await waitFor("the highlighted quote", () => withCurrentFrame(page, async (frame) =>
    await frame.locator("mark[data-okf-comment-thread]").count() === 1));
  // A click on the quote of an open popover would close it.
  if (await withCurrentFrame(page, (frame) => frame.locator("[data-okf-comment-popover]").count()) > 0) return;
  await withCurrentFrame(page, (frame) => frame.locator("mark[data-okf-comment-thread]").click());
}

/**
 * Waits for the state a review-thread step must reach (CI rule 12). When it is not reached, the
 * step is redone once with `redo` only if stepInterruption.ts finds an interruption from outside
 * since `start`: a page the host did not load replaced it, or the VS Code window lost the focus and
 * the page recorded the blur with no close of its own. The redo is logged with the full dump.
 * Otherwise, and when the redo fails too, the error carries the verdict, the host and page
 * diagnostics and the review-thread state.
 */
async function reachThreadState(
  page: Page,
  description: string,
  start: StepStart,
  reached: () => Promise<boolean>,
  redo: () => Promise<void>,
  dump: (start: StepStart, verdict: StepVerdict) => Promise<string>,
): Promise<void> {
  const attempt = (): Promise<void> => explained(page, () => waitFor(description, reached));
  const message = (error: unknown): string => (error instanceof Error ? error.message : String(error));
  try {
    await attempt();
    return;
  } catch (error) {
    const now = await readPageWitness(page);
    const verdict: StepVerdict = start.page === undefined
      ? { redo: false, reason: "the page did not witness the step's start" }
      : interruptionSince(start.page, now?.witness, now?.trace ?? [], {
        pageLoadsBefore: start.pageLoads,
        pageLoadsNow: threadCounters().pageLoads,
        stepStartedAt: start.at,
        windowStates: start.windowStates,
      }, POPOVER_CLOSED);
    if (!verdict.redo) throw new Error(`${message(error)} (no redo: ${verdict.reason}) ${await dump(start, verdict)}`);
    console.log(`review-threads: ${description}: ${verdict.reason}; the step is redone once. `
      + `${message(error)} ${await dump(start, verdict)}`);
    try {
      await redo();
      await attempt();
    } catch (second) {
      throw new Error(`${message(second)} (redone after: ${verdict.reason}) ${await dump(start, verdict)}`);
    }
  }
}

/** review-annotations/r04-r06: create, reply and resolve a review thread with the mouse and keyboard. */
export async function scenarioReviewThreads(page: Page, evidence: Evidence): Promise<void> {
  const settings = vscode.workspace.getConfiguration("markdownOkfSchemaStudio.comments");
  const originalAuthor = settings.inspect<string>("authorName")?.globalValue;
  const text = "# Notes\n\nThe first paragraph holds a quotable phrase here.\n\nThe second paragraph.\n";
  await settings.update("authorName", "Ada Reviewer", vscode.ConfigurationTarget.Global);
  try {
    await withFixtureDocument("realinput-threads", { "notes.md": text }, "notes.md", async (document, directory) => {
      const sidecar = path.join(directory, "notes.comments.json");
      await openSidePreview(document);
      await waitForPreviewReady(document);
      await setEditMode(page, false);
      const paragraph = "p:has-text('quotable phrase')";
      // Create: a double-click selects the word, the Comment button opens the box, Mod+Enter saves.
      const position = await wordPosition(page, "quotable");
      await withCurrentFrame(page, (frame) => frame.locator(paragraph).first().dblclick({ position }));
      await waitFor("the Comment button of the selection", () => withCurrentFrame(page, async (frame) =>
        await frame.locator("[data-okf-comment-create]").count() === 1
        && await frame.locator("[data-okf-comment-create]").isVisible()));
      await withCurrentFrame(page, (frame) => frame.locator("[data-okf-comment-create]").click());
      await waitFor("the comment box with the focus", () => withCurrentFrame(page, (frame) => frame.evaluate(() =>
        window.document.activeElement?.matches("[data-okf-comment-compose-input]") === true)));
      await typeText(page, "Please cite a source.");
      await press(page, `${MOD}+Enter`);
      await waitFor("the thread in the sidecar", () => readThreads(sidecar).length === 1);
      const created = readThreads(sidecar)[0]!;
      assert.equal(created.anchor.quote, "quotable");
      assert.deepEqual(created.comments.map((comment) => [comment.author, comment.body]), [["Ada Reviewer", "Please cite a source."]]);
      assert.equal(bufferText(document), text, "a review thread never edits the document");
      await waitFor("the highlighted quote and the closed box", () => withCurrentFrame(page, async (frame) =>
        await frame.locator("mark[data-okf-comment-thread]").count() === 1
        && await frame.locator("[data-okf-comment-compose]").count() === 0));
      await withCurrentFrame(page, (frame) => frame.locator("mark[data-okf-comment-thread]").click());
      await waitFor("the thread popover", () => withCurrentFrame(page, async (frame) =>
        await frame.locator("[data-okf-comment-popover] [data-okf-comment-entry]").count() === 1));
      await captureNow(evidence, page, "review-annotations/r04-thread-created",
        "Reading mode; `quotable` was selected with a double-click, commented through the Comment button "
        + "and saved with Mod+Enter. The quote is highlighted and its popover shows the comment by Ada Reviewer.");

      // Reply from the popover. Each click is made on a state the page reported; a step whose state
      // does not come is redone only when the page and the host prove an outside interruption.
      const started: StepStart[] = [];
      try {
        const reply = "Added in the next revision.";
        const beforeReply = threadCounters();
        const dumpReply = (start: StepStart, verdict?: StepVerdict): Promise<string> =>
          reviewThreadState(page, sidecar, beforeReply, start, verdict);
        const replyStart = await stepStart(page, started);
        await withCurrentFrame(page, (frame) => frame.locator("[data-okf-comment-reply-input]").click());
        await typeText(page, reply);
        await reachThreadState(page, "the typed reply in the open popover", replyStart, async () => {
          const shown = await threadPopover(page);
          return shown?.entries === 1 && shown.reply === reply;
        }, async () => {
          // The page never focuses the reply box itself: the click gives it the caret.
          await reopenThreadPopover(page);
          await withCurrentFrame(page, (frame) => frame.locator("[data-okf-comment-reply-input]").click());
          await selectAllInControl(page, "[data-okf-comment-reply-input]", "the reply box");
          await typeText(page, reply);
        }, dumpReply);
        const sendStart = await stepStart(page, started);
        await withCurrentFrame(page, (frame) => frame.locator("[data-okf-comment-reply-send]").click());
        await explained(page, () => waitFor("the reply in the sidecar", () => readThreads(sidecar)[0]?.comments.length === 2))
          .catch(async (error: unknown) => { throw new Error(`${String(error)} ${await dumpReply(sendStart)}`); });
        assert.equal(readThreads(sidecar)[0]!.comments[1]!.body, reply);
        await reachThreadState(page, "the reply in the popover", sendStart,
          async () => (await threadPopover(page))?.entries === 2, () => reopenThreadPopover(page), dumpReply);
        await captureNow(evidence, page, "review-annotations/r05-thread-reply",
          "The reply typed in the popover and sent with Reply is saved in the sidecar and listed after the first comment.");

        // Resolve from the popover, once the page shows it with both comments and Resolve enabled
        // (no answer pending). CR 174: a failure says what the page and the host held (the page
        // trace names what closed a popover).
        const beforeResolve = threadCounters();
        const dumpResolve = (start: StepStart, verdict?: StepVerdict): Promise<string> =>
          reviewThreadState(page, sidecar, beforeResolve, start, verdict);
        const readyStart = await stepStart(page, started);
        await reachThreadState(page, "the popover with both comments and Resolve enabled", readyStart, async () => {
          const shown = await threadPopover(page);
          return shown?.entries === 2 && shown.action === "Resolve" && shown.actionEnabled;
        }, () => reopenThreadPopover(page), dumpResolve);
        const resolveStart = await stepStart(page, started);
        await withCurrentFrame(page, (frame) => frame.locator("[data-okf-comment-popover] [data-okf-comment-resolve]").click());
        await explained(page, () => waitFor("the resolved thread in the sidecar", () => readThreads(sidecar)[0]?.resolved === true))
          .catch(async (error: unknown) => { throw new Error(`${String(error)} ${await dumpResolve(resolveStart)}`); });
        await reachThreadState(page, "the resolved state in the popover", resolveStart,
          async () => (await threadPopover(page))?.action === "Reopen", () => reopenThreadPopover(page), dumpResolve);
      } finally {
        started.forEach((start) => start.dispose());
      }
      assert.equal(bufferText(document), text, "a review thread never edits the document");
      await captureNow(evidence, page, "review-annotations/r06-thread-resolved",
        "Resolve was clicked: the sidecar marks the thread resolved and the popover offers Reopen.");
    });
  } finally {
    await settings.update("authorName", originalAuthor, vscode.ConfigurationTarget.Global);
  }
}

// @tests_req StRS-MDOKFSTUDIO-PALETTE-018
/**
 * palette-slash/r09: an image pasted into a block editor. The paste event is dispatched on the
 * editor's textarea with the PNG file in its clipboard data (a test cannot put an image on the
 * system clipboard of the CI display); everything after it is the product's own path: the page
 * reads the file, the host writes it next to the document, the page inserts the reference.
 */
export async function scenarioImagePaste(page: Page, evidence: Evidence): Promise<void> {
  const png = fs.readFileSync(path.join(extensionRoot, "test", "integration", "fixtures", "markdown-logo.png"));
  const text = "# Chapter\n\nText before the image.\n";
  await withFixtureDocument("realinput-paste", { "chapter.md": text }, "chapter.md", async (document, directory) => {
    await openSidePreview(document);
    await waitForPreviewReady(document);
    try {
      await setEditMode(page, true);
      await withCurrentFrame(page, (frame) => frame.locator("p", { hasText: "Text before the image." }).first().click());
      await waitForEditor(page, "[data-sphinx-preview-block-editor] textarea");
      await press(page, "End");
      await typeText(page, " ");
      await withCurrentFrame(page, (frame) => frame.evaluate((base64) => {
        const textarea = window.document.querySelector("[data-sphinx-preview-block-editor] textarea");
        if (!textarea) throw new Error("no block editor");
        const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
        const data = new DataTransfer();
        data.items.add(new File([bytes], "clipboard.png", { type: "image/png" }));
        textarea.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
      }, png.toString("base64")));
      // The page inserts the reference only on the host's answer, which the host sends once
      // the file is complete under its name (hidden file + rename). Waiting for the file to exist
      // read it while VS Code's writeFile had created it but not written it (CI run 40016132398).
      const imagePath = path.join(directory, "image.png");
      const pasteState = async (): Promise<string> => {
        const value = await withCurrentFrame(page, (frame) =>
          frame.locator("[data-sphinx-preview-block-editor] textarea").inputValue()).catch((error: unknown) => `<${String(error)}>`);
        return `folder: ${describeFolder(directory)}; editor text: ${JSON.stringify(value)}`;
      };
      try {
        await waitFor("the reference in the editor", () => withCurrentFrame(page, async (frame) =>
          (await frame.locator("[data-sphinx-preview-block-editor] textarea").inputValue()).includes("![image.png](image.png)")));
      } catch (error) {
        throw new Error(`${String(error)} ${await pasteState()}`);
      }
      const saved = fs.existsSync(imagePath) ? fs.readFileSync(imagePath) : undefined;
      assert.deepEqual(saved, png,
        `the pasted bytes are saved unchanged (expected ${png.length} B, saved ${saved?.length ?? "no file"}; ${await pasteState()})`);
      await press(page, `${MOD}+Enter`);
      await waitFor("the committed block with the image", () => withCurrentFrame(page, async (frame) =>
        await frame.locator("[data-sphinx-preview-block-editor]").count() === 0
        && await frame.locator('img[src*="image.png"]').count() === 1
        && await frame.locator('img[src*="image.png"]').evaluate((image) => (image as HTMLImageElement).naturalWidth > 0)));
      // CR 050: the image goes on a paragraph of its own; the typed space does not stay on the text line.
      assert.equal(bufferText(document), "# Chapter\n\nText before the image.\n\n![image.png](image.png)\n");
      await captureNow(evidence, page, "palette-slash/r09-image-paste-inserted",
        "Edit mode on; a PNG was pasted at the end of the paragraph editor and committed with Mod+Enter. "
        + "The host saved it as image.png next to the document and the image is a paragraph of its own under the text.");
    } finally {
      await leaveEditMode(page);
    }
  });
}

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-150
// @tests_req SwRS-MDOKFSTUDIO-PALETTE-153
/**
 * CR 117: Figure with a picked image inserts the directive and opens the figure form right away,
 * on the caption field. The native image dialog is stubbed in the host (a test cannot drive it);
 * the page, the host request and the form are the product's own. Escape keeps the inserted figure.
 */
export async function scenarioFigureInsert(page: Page, evidence: Evidence): Promise<void> {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60"><rect width="120" height="60" fill="#789"/></svg>\n';
  const windowApi = vscode.window as unknown as { showOpenDialog: typeof vscode.window.showOpenDialog };
  const originalDialog = windowApi.showOpenDialog;
  await withFixtureDocument("realinput-figure-insert", { "chapter.md": "# Chapter\n\nText.\n", "images/chip.svg": svg }, "chapter.md",
    async (document, directory) => {
      windowApi.showOpenDialog = () => Promise.resolve([vscode.Uri.file(path.join(directory, "images", "chip.svg"))]);
      await openSidePreview(document);
      await waitForPreviewReady(document);
      try {
        await setEditMode(page, true);
        await withCurrentFrame(page, (frame) => frame.locator("p", { hasText: "Text." }).first().click());
        await waitForEditor(page, "[data-sphinx-preview-block-editor] textarea");
        // The native select popup cannot be driven through CDP: selectOption is the allowed exception.
        await withCurrentFrame(page, (frame) => frame.locator(".sphinx-preview-edit-palette select").selectOption("myst"));
        await withCurrentFrame(page, (frame) => frame.locator("[data-edit-action='figure']").click());
        await waitFor("the figure form after the image pick", () => withCurrentFrame(page, async (frame) =>
          await frame.locator("[role='dialog'][aria-label='Edit figure']").count() === 1));
        await withCurrentFrame(page, async (frame) => {
          assert.equal(await frame.locator("[data-figure-field='source']").inputValue(), "images/chip.svg");
          assert.equal(await frame.locator("[data-figure-field='alt']").inputValue(), "chip");
          assert.equal(await frame.locator("[data-figure-field='caption']").evaluate((field) => field === window.document.activeElement),
            true, "the caption field has the focus");
        });
        await typeText(page, "The chip.");
        await withCurrentFrame(page, (frame) => frame.locator("[data-figure-action='apply']").click());
        const editorText = (): Promise<string> => withCurrentFrame(page, (frame) =>
          frame.locator("[data-sphinx-preview-block-editor] textarea").inputValue());
        try {
          await waitFor("the caption in the editor", async () => /:::\{figure\} images\/chip\.svg\n:alt: chip\n\n+The chip\.\n:::/u.test(await editorText()));
        } catch (error) {
          throw new Error(`${String(error)} Editor text: ${JSON.stringify(await editorText().catch(() => undefined))}`);
        }
        await press(page, `${MOD}+Enter`);
        await waitFor("the saved figure", () => /:::\{figure\} images\/chip\.svg\n:alt: chip\n\n+The chip\.\n:::/u.test(bufferText(document)));
        await waitFor("the block editor to close", () => withCurrentFrame(page, async (frame) =>
          await frame.locator("[data-sphinx-preview-block-editor]").count() === 0));
      } finally {
        windowApi.showOpenDialog = originalDialog;
        await leaveEditMode(page);
      }
    });
}

// @tests_req StRS-MDOKFSTUDIO-BLOCK-001
// @tests_req StRS-MDOKFSTUDIO-TRUST-001
/** trust-security/r01: the side preview of an untrusted workspace (runs in the Restricted Mode window). */
export async function scenarioUntrustedReadOnly(page: Page, evidence: Evidence): Promise<void> {
  assert.equal(vscode.workspace.isTrusted, false, "this scenario runs in the Restricted Mode window");
  const text = "# Restricted Mode\n\nThis workspace is not trusted.\n\n- the preview renders\n- nothing can be edited\n";
  await withFixtureDocument("untrusted-capture", { "restricted.md": text }, "restricted.md", async (document) => {
    await openSidePreview(document);
    await waitForPreviewReady(document);
    assert.equal(getActivePreviewForTests()?.readOnly, true);
    const frame = await currentPreviewFrame(page);
    const editButton = frame.locator("[data-sphinx-preview-edit-toggle]");
    assert.equal(await editButton.count(), 1, "the Edit button stays visible");
    assert.equal(await editButton.getAttribute("aria-disabled"), "true", "the Edit button is greyed");
    assert.match((await editButton.getAttribute("data-tooltip")) ?? "", /^Editing is unavailable: .*trusted workspace/u);
    assert.notEqual(await frame.locator("html").getAttribute("data-sphinx-preview-edit-mode"), "on");
    // The refusal toasts of the suite's earlier checks would cover the preview.
    await vscode.commands.executeCommand("notifications.clearAll");
    await captureNow(evidence, page, "trust-security/r01-untrusted-read-only",
      "Restricted Mode window: the side preview renders the document read-only and the toolbar shows the Edit button greyed, with its reason as tooltip.");
  });
}
