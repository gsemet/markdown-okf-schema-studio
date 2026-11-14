import type { Page } from "playwright-core";
import * as vscode from "vscode";
import { previewGroupUnlocksSettledForTests } from "./extensionApi";
import { findCurrentFrame, waitFor } from "./realInput/harness";
import { bounded } from "./stepWatchdog";
import { activateMacProcess, macFocusDiagnostics } from "./macWindow";
import { workbenchFocusDump } from "../shared/workbenchFocusDump";

/**
 * The real-window suites drive VS Code through CDP. On macOS that only works once the test window
 * has been the active (key) window: a window that never received the OS focus keeps the DOM focus
 * in its editor (`document.activeElement` is the editor's `native-edit-context`, focus emulation
 * makes `document.hasFocus()` true), yet the workbench sees no focused code editor, so `undo`,
 * `cursorTop` and typed keys reach nothing. macOS leaves a newly launched app in the background when
 * the user is working in another app (cooperative activation) or when the screen is locked; CI's
 * xvfb display has no window manager, so on Linux the window can be unfocused when the first real
 * click arrives: the click then activates it late and the workbench restores its focus through
 * `body`, blurring the block editor (CR 326). Losing the focus later is harmless; never having it is not.
 */
const ACTIVATION_TIMEOUT_MS = 10_000;

/**
 * Waits until VS Code reports the test window as focused (`window.state.focused`), asking the OS
 * to bring the window to the front first when it is not (macOS: System Events; Linux: nothing
 * can raise it from the extension host, `waitForWorkbenchFocusSettled` does it over CDP). The wait
 * is bounded and event driven (`onDidChangeWindowState`). Fails with the window diagnostics when the window cannot become active (a locked screen). Windows returns
 * at once.
 */
export async function ensureTestWindowFocused(): Promise<void> {
  if (process.platform !== "darwin" || vscode.window.state.focused) return;
  // The extension host is a child of the window's main process, the app the OS activates; on macOS
  // that VS Code build is also the app that asks for the Automation permission.
  const activation = activateMacProcess(process.ppid, `the VS Code build at ${vscode.env.appRoot}`);
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      subscription.dispose();
      reject(new Error("The VS Code test window never became the active window (OS activation "
        + `${activation}). The real-window tests need an unlocked session. ${hostFocusReport()}`));
    }, ACTIVATION_TIMEOUT_MS);
    const subscription = vscode.window.onDidChangeWindowState((state) => {
      if (!state.focused) return;
      clearTimeout(timer);
      subscription.dispose();
      resolve();
    });
    if (vscode.window.state.focused) {
      clearTimeout(timer);
      subscription.dispose();
      resolve();
    }
  });
}

/**
 * What a step that fails on its first real click should carry: the host and workbench focus report
 * and the tabs left in every group (a leftover tab from an earlier step shows up here).
 */
export async function clickFailureDetails(page: Page): Promise<string> {
  const tabs = vscode.window.tabGroups.all.map((group, index) =>
    `group ${index + 1}${group.isActive ? " (active)" : ""}: ${group.tabs.map((tab) => `${tab.label}${tab.isActive ? "*" : ""}${tab.isDirty ? " (dirty)" : ""}`).join(", ") || "no tab"}`);
  return `Window focus: ${await windowFocusReport(page)}; tabs: ${tabs.join(" | ")}`;
}

/**
 * Waits until the window can take the first real click of a step that has just opened its preview:
 * Chromium activates the page (CDP `Page.bringToFront`), VS Code reports the window focused and no
 * group unlock focus command is pending. States the host reports, no delay; the webview itself is
 * not required to be the active element yet (it becomes so by that very click).
 */
export async function waitForFirstClickReady(page: Page): Promise<void> {
  try {
    await ensureTestWindowFocused();
    await bounded("page.bringToFront", page.bringToFront());
    await bounded("previewGroupUnlocksSettledForTests", previewGroupUnlocksSettledForTests());
    await waitFor("the window to be focused", () => vscode.window.state.focused);
  } catch (error) {
    throw new Error(`${error instanceof Error ? error.message : String(error)} ${await windowFocusReport(page)}`);
  }
}

/**
 * Waits until a real click in the preview cannot be preceded by a late focus move: VS Code reports
 * the window focused, no group unlock focus command is pending, the webview is the workbench's active
 * element and the content document has the focus. Each condition is a state the host or the page
 * reports; none is a delay. Fails with the focus report (CI guidelines rule 12).
 */
export async function waitForWorkbenchFocusSettled(page: Page): Promise<void> {
  try {
    await ensureTestWindowFocused();
    // Chromium's own request to activate the window and page (CDP Page.bringToFront); the one
    // focus request that needs no package on a display without a window manager.
    await bounded("page.bringToFront", page.bringToFront());
    await bounded("previewGroupUnlocksSettledForTests", previewGroupUnlocksSettledForTests());
    await waitFor("the window focused, the webview active in the workbench and the content focused", async () => {
      if (!vscode.window.state.focused) return false;
      const webviewActive = await page.evaluate(() => {
        const active = document.activeElement;
        return active instanceof HTMLIFrameElement && active.classList.contains("webview");
      });
      if (!webviewActive) return false;
      const frame = await findCurrentFrame(page);
      return frame !== undefined && await frame.evaluate(() => document.hasFocus());
    });
  } catch (error) {
    throw new Error(`${error instanceof Error ? error.message : String(error)} ${await windowFocusReport(page)}`);
  }
}

/**
 * Waits until VS Code reports `document` as the active text editor, after the `showTextDocument`
 * that gave it the focus (its group is then the active group). The real-window tests used to follow
 * that call with `workbench.action.focusFirstEditorGroup`: a focus command by group position adds a
 * focus move of its own and lands on whatever group sits first, while the next step (the Studio
 * command, an undo) needs the state checked here. Fails after `timeoutMs` with the host report.
 */
export async function waitForActiveSourceEditor(document: vscode.TextDocument, timeoutMs = 10_000): Promise<void> {
  const active = (): boolean => vscode.window.activeTextEditor?.document.uri.toString() === document.uri.toString();
  if (active()) return;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      subscription.dispose();
      reject(new Error(`${document.uri.fsPath} never became the active text editor. ${hostFocusReport()}`));
    }, timeoutMs);
    const subscription = vscode.window.onDidChangeActiveTextEditor(() => {
      if (!active()) return;
      clearTimeout(timer);
      subscription.dispose();
      resolve();
    });
  });
}

/** What the extension host and macOS report about the test window (no page access needed). */
function hostFocusReport(): string {
  const report: Record<string, unknown> = {
    vscode: `${vscode.version} (${vscode.env.appRoot})`,
    windowState: { focused: vscode.window.state.focused, active: vscode.window.state.active },
    activeTextEditor: vscode.window.activeTextEditor?.document.uri.fsPath ?? null,
    activeTab: vscode.window.tabGroups.activeTabGroup.activeTab?.label ?? null,
  };
  if (process.platform === "darwin") {
    report.testWindowPid = process.ppid;
    Object.assign(report, macFocusDiagnostics());
  }
  return JSON.stringify(report);
}

/**
 * What the host, the workbench page and the OS held when a focus-dependent step failed: the VS Code
 * build, the window focus VS Code reports, the active editor, the page's focus and which code editor
 * has the text focus (by model URI), any workbench toast or dialog, and on macOS the frontmost app,
 * then the workbench focus dump (focused part, active element path, visible parts, toasts, recent
 * focus moves: workbenchFocusDump.ts), read first so it is the closest to the failure.
 * Failure messages of undo and typing waits carry it (CI guidelines rule 12).
 */
export async function windowFocusReport(page: Page): Promise<string> {
  const workbench = await workbenchFocusDump(page);
  const frames = await Promise.all(page.frames().map(async (frame) => {
    try {
      return { url: frame.url(), state: await frame.evaluate(() => ({
        content: document.querySelector("#sphinx-myst-preview-content") !== null,
        documentId: document.documentElement.getAttribute("data-sphinx-preview-document-id"),
        version: document.documentElement.getAttribute("data-sphinx-preview-document-version"),
        requestId: document.documentElement.getAttribute("data-sphinx-preview-request-id"),
        visibility: document.visibilityState,
        editorTrace: (window as unknown as { __studioDiagnostics?: { trace(): unknown } }).__studioDiagnostics?.trace(),
      })) };
    } catch (error) {
      return { url: frame.url(), error: String(error) };
    }
  }));
  let pageState: unknown;
  try {
    pageState = await page.evaluate(() => {
      const active = document.activeElement;
      return {
        hasFocus: document.hasFocus(),
        visibility: document.visibilityState,
        activeElement: active ? `${active.tagName.toLowerCase()}.${String(active.className).split(/\s+/u).join(".")}` : null,
        activeEditorUri: active?.closest(".monaco-editor")?.getAttribute("data-uri") ?? null,
        textFocusedEditors: Array.from(document.querySelectorAll(".monaco-editor.focused"))
          .map((element) => element.getAttribute("data-uri") ?? "(no uri)"),
        // A toast or a dialog of the workbench (an undo VS Code refused says why there).
        messages: Array.from(document.querySelectorAll(
          ".notifications-toasts .notification-list-item-message, .monaco-dialog-box .dialog-message-text",
        )).map((element) => (element.textContent ?? "").trim()).filter((text) => text !== ""),
      };
    });
  } catch (error) {
    pageState = `unavailable: ${String(error)}`;
  }
  return `${hostFocusReport().slice(0, -1)},"page":${JSON.stringify(pageState)},"frames":${JSON.stringify(frames)}}\n${workbench}`;
}

/** One content change seen by a document trace, as `onDidChangeTextDocument` reported it. */
interface TracedChange {
  /** Milliseconds since the trace started. */
  at: number;
  /** File name of the changed document when it is not the traced one (an undo can reach another file). */
  other?: string;
  version: number;
  reason: "undo" | "redo" | "edit";
  changes: Array<{ line: number; rangeLength: number; text: string }>;
}

/**
 * Records every content change of `document` from now on, with its reason (undo, redo or a plain
 * edit), so an undo wait that fails can say whether the undo ran and what changed the buffer.
 * Changes of other files are recorded too, with their name: an undo that VS Code applied to
 * another file shows up there.
 */
export function traceDocumentChanges(document: vscode.TextDocument): { report(): string; dispose(): void } {
  const started = Date.now();
  const entries: TracedChange[] = [];
  const subscription = vscode.workspace.onDidChangeTextDocument((event) => {
    if (event.contentChanges.length === 0 || event.document.uri.scheme !== "file") return;
    const other = event.document.uri.toString() === document.uri.toString() ? undefined
      : event.document.uri.path.split("/").pop();
    entries.push({
      at: Date.now() - started,
      ...(other === undefined ? {} : { other }),
      version: event.document.version,
      reason: event.reason === vscode.TextDocumentChangeReason.Undo ? "undo"
        : event.reason === vscode.TextDocumentChangeReason.Redo ? "redo" : "edit",
      changes: event.contentChanges.map((change) => ({
        line: change.range.start.line + 1, rangeLength: change.rangeLength, text: change.text.slice(0, 60),
      })),
    });
  });
  return {
    report: () => JSON.stringify({ version: document.version, dirty: document.isDirty, changes: entries }),
    dispose: () => subscription.dispose(),
  };
}
