/**
 * Where the keyboard focus is INSIDE the VS Code workbench when a real-window step fails: the
 * active element of the main window and its ancestors, the workbench part that holds it (editor,
 * webview, panel, sidebar, auxiliary bar, chat, notification toast, quick input, dialog, menu),
 * the visible parts and views, toasts and dialogs, and the recent focus moves of the page.
 *
 * A focus move inside the workbench keeps `window.state.focused` true, so the host report alone
 * cannot see it (a block editor then commits on blur). This file is read-only: it never calls
 * `focus()`, clicks or takes a screenshot, so collecting the dump cannot move the focus.
 *
 * `formatWorkbenchFocusDump` and `focusedWorkbenchPart` are pure (unit-tested in
 * test/build/workbenchFocusDump.test.ts). `collectWorkbenchFocusSnapshot` evaluates in the
 * workbench page over CDP and is best-effort: it never throws and answers within a short bound.
 *
 * It also reads each webview HOST frame: the outer `index.html` VS Code puts around a webview's
 * content frame (the page `fake.html` of the preview). The workbench only sees the webview's
 * `<iframe>`; a focus that moves inside that outer frame (to its body, or between its active and
 * pending content frames) blurs the preview's text box while the workbench still reports the
 * webview as focused. Its active element, `hasFocus` and focus moves name that hop.
 *
 * The dump describes the moment it is read. A scenario's cleanup closes its editors (and the webview
 * with them) before the error reaches the suite's handler, so a dump read there shows the empty
 * editor group the close left and no webview host frame. `withFocusDumpOnFailure` reads it when the
 * step fails, before that cleanup; a host frame list that is empty names the frames the page has.
 *
 * VS Code focus context keys (`editorTextFocus`, `chatInputHasFocus`, ...) are not reachable from
 * the page: the context key service is internal, and the `getContextKeyInfo` command lists key
 * names, not values. The focused part derived from the DOM stands in for them.
 */
import type { Page } from "playwright-core";

/** One element of the focus path, as the page describes it. */
export interface WorkbenchElement {
  tag: string;
  id?: string;
  classes: string[];
  role?: string;
  ariaLabel?: string;
  /** `data-keybinding-context` of the element, the scope of its context keys. */
  keybindingContext?: string;
}

export interface WorkbenchPartState {
  /** `workbench.parts.<name>` without the prefix. */
  name: string;
  visible: boolean;
  /** Title of the active view container or composite, when the part shows one. */
  title?: string;
}

export interface WorkbenchFocusMove {
  /** Milliseconds before the snapshot. */
  ago: number;
  type: string;
  target: string;
}

/** What the workbench page reported, raw. */
export interface WorkbenchFocusSnapshot {
  hasFocus: boolean;
  visibility: string;
  activeElement: WorkbenchElement | null;
  /** Ancestors of the active element, nearest first, up to `<body>`. */
  ancestors: WorkbenchElement[];
  parts: WorkbenchPartState[];
  activeEditorTab?: string;
  quickInput: { visible: boolean; title?: string };
  toasts: Array<{ message: string; source?: string }>;
  notificationCenterVisible: boolean;
  dialogs: string[];
  contextViewVisible: boolean;
  chat: { widgets: number; visible: number };
  /** Recent focus moves recorded by `installWorkbenchFocusTrace`, oldest first; absent when not installed. */
  focusTrace?: WorkbenchFocusMove[];
}

/** The collector's answer: a snapshot, or why there is none. */
export type WorkbenchFocusResult = { snapshot: WorkbenchFocusSnapshot } | { unavailable: string };

/** Short, stable form of an element: `tag#id.class.class[role=..][aria-label="..."]`. */
export function describeWorkbenchElement(element: WorkbenchElement): string {
  const id = element.id ? `#${element.id}` : "";
  const classes = element.classes.slice(0, 6).map((name) => `.${name}`).join("");
  const role = element.role ? `[role=${element.role}]` : "";
  const label = element.ariaLabel ? `[aria-label=${JSON.stringify(element.ariaLabel.slice(0, 80))}]` : "";
  const context = element.keybindingContext ? `[context=${element.keybindingContext}]` : "";
  return `${element.tag}${id}${classes}${role}${label}${context}`;
}

const PART_LABELS: Record<string, string> = {
  editor: "editor",
  sidebar: "sidebar",
  panel: "panel",
  auxiliarybar: "auxiliary bar",
  statusbar: "status bar",
  titlebar: "title bar",
  activitybar: "activity bar",
  banner: "banner",
};

/**
 * The workbench part that holds the focus, from the active element and its ancestors, outermost
 * first: `editor > webview`, `auxiliary bar > chat`, `notification toast`, `quick input`, or
 * `none (document body)` when nothing in the workbench has the focus.
 */
export function focusedWorkbenchPart(snapshot: Pick<WorkbenchFocusSnapshot, "activeElement" | "ancestors">): string {
  const active = snapshot.activeElement;
  if (active === null) return "none (no active element)";
  const chain = [active, ...snapshot.ancestors];
  const has = (name: string): boolean => chain.some((element) => element.classes.includes(name));
  // Overlays first: they sit outside the parts.
  if (has("quick-input-widget")) return "quick input";
  if (has("notification-toast") || has("notifications-toasts")) return "notification toast";
  if (has("notifications-center")) return "notification center";
  if (has("monaco-dialog-box")) return "dialog";
  if (has("context-view") || has("monaco-menu-container")) return "context menu or hover";
  const segments: string[] = [];
  const part = chain.find((element) => element.id?.startsWith("workbench.parts."));
  if (part !== undefined) {
    const name = part.id!.slice("workbench.parts.".length);
    segments.push(PART_LABELS[name] ?? name);
  }
  if (has("interactive-session") || has("chat-widget") || has("interactive-input-part")) segments.push("chat");
  else if (active.tag === "iframe" && active.classes.includes("webview")) segments.push("webview");
  else if (has("monaco-editor")) segments.push("code editor");
  else if (has("terminal")) segments.push("terminal");
  if (segments.length > 0) return segments.join(" > ");
  if (active.tag === "body") return "none (document body)";
  return "outside the workbench parts";
}

const MAX_ANCESTORS = 12;

/**
 * The dump as text, one fact per line, for a failure message or the log. `unavailable` results
 * keep the reason, so a missing dump explains itself too.
 */
export function formatWorkbenchFocusDump(result: WorkbenchFocusResult): string {
  const header = "Workbench focus (main window, read over CDP):";
  if ("unavailable" in result) return `${header} unavailable: ${result.unavailable}`;
  const snapshot = result.snapshot;
  const lines = [header];
  lines.push(`  focused part: ${focusedWorkbenchPart(snapshot)}`);
  lines.push(`  active element: ${snapshot.activeElement === null ? "none" : describeWorkbenchElement(snapshot.activeElement)}`);
  const path = snapshot.ancestors.slice(0, MAX_ANCESTORS).map(describeWorkbenchElement);
  const more = snapshot.ancestors.length > MAX_ANCESTORS ? ` < ... (${snapshot.ancestors.length - MAX_ANCESTORS} more)` : "";
  lines.push(`  ancestors (nearest first): ${path.length === 0 ? "none" : path.join(" < ") + more}`);
  lines.push(`  document: hasFocus=${snapshot.hasFocus} visibility=${snapshot.visibility}`);
  lines.push("  focus context keys: not reachable from the page (internal service); see the focused part");
  const visible = snapshot.parts.filter((part) => part.visible)
    .map((part) => (PART_LABELS[part.name] ?? part.name) + (part.title ? ` (${part.title})` : ""));
  const hidden = snapshot.parts.filter((part) => !part.visible).map((part) => PART_LABELS[part.name] ?? part.name);
  lines.push(`  visible parts: ${visible.length === 0 ? "none" : visible.join(", ")}`
    + (hidden.length === 0 ? "" : `; hidden: ${hidden.join(", ")}`));
  lines.push(`  active editor tab: ${snapshot.activeEditorTab ?? "none"}`);
  lines.push(`  chat widgets: ${snapshot.chat.visible} visible of ${snapshot.chat.widgets}`);
  lines.push(`  quick input: ${snapshot.quickInput.visible ? `visible${snapshot.quickInput.title ? ` (${snapshot.quickInput.title})` : ""}` : "hidden"}`);
  lines.push(`  notification toasts: ${snapshot.toasts.length === 0 ? "none" : snapshot.toasts
    .map((toast) => JSON.stringify(toast.message.slice(0, 160)) + (toast.source ? ` (${toast.source})` : "")).join("; ")}`);
  lines.push(`  notification center: ${snapshot.notificationCenterVisible ? "visible" : "hidden"}`);
  lines.push(`  dialogs: ${snapshot.dialogs.length === 0 ? "none" : snapshot.dialogs.map((text) => JSON.stringify(text.slice(0, 160))).join("; ")}`);
  lines.push(`  context menu or hover: ${snapshot.contextViewVisible ? "visible" : "none"}`);
  if (snapshot.focusTrace === undefined) {
    lines.push("  recent focus moves: not recorded (no trace installed in this window)");
  } else {
    lines.push(`  recent focus moves (oldest first):${snapshot.focusTrace.length === 0 ? " none" : ""}`);
    for (const move of snapshot.focusTrace) lines.push(`    -${move.ago} ms ${move.type} ${move.target}`);
  }
  return lines.join("\n");
}

/** What a webview host frame (the outer `index.html` of a webview) reported, raw. */
export interface WebviewHostFrameSnapshot {
  hasFocus: boolean;
  visibility: string;
  activeElement: WorkbenchElement | null;
  /** Ancestors of the active element, nearest first, up to `<body>`. */
  ancestors: WorkbenchElement[];
  /** Recent focus moves of this frame, oldest first; absent when the trace is not installed in it. */
  focusTrace?: WorkbenchFocusMove[];
}

/** One webview host frame: its URL and what it answered. */
export interface WebviewHostFrameResult {
  url: string;
  result: { snapshot: WebviewHostFrameSnapshot } | { unavailable: string };
}

/** The outer frame VS Code wraps around every webview: `vscode-webview://<authority>/index.html?...`. */
export function isWebviewHostFrameUrl(url: string): boolean {
  return /^vscode-webview:\/\/[^/]+\/index\.html(?:[?#]|$)/u.test(url);
}

/** Short name of a webview host frame: `index.html` with the webview id and extension when given. */
export function describeWebviewFrameUrl(url: string): string {
  let parameters: URLSearchParams;
  try {
    parameters = new URL(url).searchParams;
  } catch {
    return url.slice(0, 120);
  }
  const id = parameters.get("id");
  const extension = parameters.get("extensionId");
  return "index.html" + (id ? ` id=${id}` : "") + (extension ? ` extension=${extension}` : "");
}

/** Short name of any frame of the workbench page, for the list of frames when no host frame is found. */
function describePageFrameUrl(url: string): string {
  if (isWebviewHostFrameUrl(url)) return describeWebviewFrameUrl(url);
  const match = /^vscode-webview:\/\/[^/]+\/([^?#]*)(?:\?(?:[^#]*&)?id=([^&#]+))?/u.exec(url);
  if (match !== null) return `webview ${match[1] || "/"}${match[2] ? ` id=${match[2]}` : ""}`;
  const file = /([^/?#]+)(?:[?#].*)?$/u.exec(url)?.[1];
  return file ?? (url.slice(0, 80) || "(no url)");
}

/**
 * Why no webview host frame was read, from the URLs of every frame of the page: no webview is open
 * (the frames listed are the workbench's own), or webview frames exist without their outer
 * `index.html` (a host frame this dump does not recognise).
 */
export function explainMissingHostFrames(pageFrameUrls: readonly string[]): string {
  const names = pageFrameUrls.map(describePageFrameUrl);
  const listed = `${pageFrameUrls.length} frame(s) in the page: ${names.length === 0 ? "none" : names.join(", ")}`;
  return pageFrameUrls.some((url) => url.startsWith("vscode-webview:"))
    ? `webview frames without a recognised index.html host frame (${listed})`
    : `no webview is open (${listed})`;
}

/**
 * The webview host frames as text, one fact per line: per frame its focus, active element path
 * and recent focus moves. No frame says so (and why, when the page's frame URLs are given); an
 * unanswered frame keeps the reason.
 */
export function formatWebviewHostFrames(
  frames: WebviewHostFrameResult[] | { unavailable: string },
  pageFrameUrls?: readonly string[],
): string {
  const header = "Webview host frames (outer index.html around each webview content frame, read over CDP):";
  if (!Array.isArray(frames)) return `${header} unavailable: ${frames.unavailable}`;
  if (frames.length === 0) {
    return `${header} none attached${pageFrameUrls === undefined ? "" : `: ${explainMissingHostFrames(pageFrameUrls)}`}`;
  }
  const lines = [header];
  for (const frame of frames) {
    lines.push(`  ${describeWebviewFrameUrl(frame.url)}:`);
    if ("unavailable" in frame.result) {
      lines.push(`    unavailable: ${frame.result.unavailable}`);
      continue;
    }
    const snapshot = frame.result.snapshot;
    lines.push(`    document: hasFocus=${snapshot.hasFocus} visibility=${snapshot.visibility}`);
    lines.push(`    active element: ${snapshot.activeElement === null ? "none" : describeWorkbenchElement(snapshot.activeElement)}`);
    const path = snapshot.ancestors.slice(0, MAX_ANCESTORS).map(describeWorkbenchElement);
    lines.push(`    ancestors (nearest first): ${path.length === 0 ? "none" : path.join(" < ")}`);
    if (snapshot.focusTrace === undefined) {
      lines.push("    recent focus moves: not recorded (no trace installed in this frame)");
    } else {
      lines.push(`    recent focus moves (oldest first):${snapshot.focusTrace.length === 0 ? " none" : ""}`);
      for (const move of snapshot.focusTrace) lines.push(`      -${move.ago} ms ${move.type} ${move.target}`);
    }
  }
  return lines.join("\n");
}

/** How long the collector waits for the page. A dump that is late says so; it never delays a failure longer. */
export const WORKBENCH_FOCUS_DUMP_TIMEOUT_MS = 2_000;

/** A frame of the workbench page, as the dump reads it (a Playwright `Frame`). */
export interface DumpFrame {
  url(): string;
  evaluate: Page["evaluate"];
}

/**
 * The workbench page, as the dump reads it: `evaluate` for the main window, and `frames` (with the
 * `framenavigated` event) for the webview host frames when the caller has them.
 */
export interface EvaluatingPage {
  evaluate: Page["evaluate"];
  frames?(): DumpFrame[];
  on?(event: "framenavigated", listener: (frame: DumpFrame) => void): unknown;
}

/** Resolves `promise`, or `undefined` after `timeoutMs` (the timer never keeps the process alive). */
async function within<T>(promise: Promise<T>, timeoutMs: number): Promise<T | undefined> {
  let timer: NodeJS.Timeout | undefined;
  const late = new Promise<undefined>((resolve) => {
    timer = setTimeout(() => resolve(undefined), timeoutMs);
    timer.unref?.();
  });
  try {
    return await Promise.race([promise, late]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Reads the workbench snapshot from the main window. Never throws, answers within `timeoutMs`
 * (a page that does not answer gives `unavailable`), and only reads the DOM.
 */
export async function collectWorkbenchFocusSnapshot(
  page: EvaluatingPage | undefined,
  timeoutMs: number = WORKBENCH_FOCUS_DUMP_TIMEOUT_MS,
): Promise<WorkbenchFocusResult> {
  if (page === undefined) return { unavailable: "no workbench page attached" };
  try {
    const evaluation = page.evaluate(readWorkbenchSnapshotInPage);
    evaluation.catch(() => undefined); // a late rejection after the timeout is not unhandled
    const snapshot = await within(evaluation, timeoutMs);
    return snapshot === undefined ? { unavailable: `the page did not answer within ${timeoutMs} ms` } : { snapshot };
  } catch (error) {
    return { unavailable: error instanceof Error ? error.message.split("\n")[0]! : String(error) };
  }
}

/**
 * Reads every webview host frame of the page, in parallel, each bounded like the main window.
 * Never throws; a page without `frames` gives `unavailable`.
 */
export async function collectWebviewHostFrames(
  page: EvaluatingPage | undefined,
  timeoutMs: number = WORKBENCH_FOCUS_DUMP_TIMEOUT_MS,
): Promise<WebviewHostFrameResult[] | { unavailable: string }> {
  if (page === undefined) return { unavailable: "no workbench page attached" };
  if (page.frames === undefined) return { unavailable: "the page lists no frames" };
  let frames: DumpFrame[];
  try {
    frames = page.frames().filter((frame) => isWebviewHostFrameUrl(frame.url()));
  } catch (error) {
    return { unavailable: error instanceof Error ? error.message.split("\n")[0]! : String(error) };
  }
  return Promise.all(frames.map(async (frame): Promise<WebviewHostFrameResult> => {
    const url = frame.url();
    try {
      const evaluation = frame.evaluate(readFrameFocusInPage);
      evaluation.catch(() => undefined);
      const snapshot = await within(evaluation, timeoutMs);
      return { url, result: snapshot === undefined ? { unavailable: `the frame did not answer within ${timeoutMs} ms` } : { snapshot } };
    } catch (error) {
      return { url, result: { unavailable: error instanceof Error ? error.message.split("\n")[0]! : String(error) } };
    }
  }));
}

/**
 * The formatted dump of the main window, then of the webview host frames, best-effort (see
 * `collectWorkbenchFocusSnapshot`). Both are read at once, so they describe the same moment.
 */
export async function workbenchFocusDump(page: EvaluatingPage | undefined, timeoutMs?: number): Promise<string> {
  const [main, frames] = await Promise.all([
    collectWorkbenchFocusSnapshot(page, timeoutMs),
    collectWebviewHostFrames(page, timeoutMs),
  ]);
  let pageFrameUrls: string[] | undefined;
  if (Array.isArray(frames) && frames.length === 0) {
    try {
      pageFrameUrls = page?.frames?.().map((frame) => frame.url());
    } catch {
      // The list only explains the empty section; without it the section stays as it is.
    }
  }
  return `${formatWorkbenchFocusDump(main)}\n${formatWebviewHostFrames(frames, pageFrameUrls)}`;
}

/**
 * Runs `action`; when it throws, reads the dump at once (before the cleanup the caller runs after
 * it, which closes the webview), hands it to `record`, and rethrows the same error. Without a page
 * it only runs `action`. The dump is bounded and never throws (see `workbenchFocusDump`).
 */
export async function withFocusDumpOnFailure<T>(
  page: EvaluatingPage | undefined,
  action: () => Promise<T>,
  record: (dump: string) => void,
  timeoutMs?: number,
): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (page !== undefined) record(await workbenchFocusDump(page, timeoutMs));
    throw error;
  }
}

/** Installs the focus trace in one window or frame, bounded; a failure only leaves it without one. */
async function installTraceIn(target: Pick<DumpFrame, "evaluate">, timeoutMs: number): Promise<void> {
  try {
    const installation = target.evaluate(installFocusTraceInPage);
    installation.catch(() => undefined);
    await within(installation, timeoutMs);
  } catch {
    // Diagnostics only: a window without the trace still gets the snapshot.
  }
}

/**
 * Records the focus moves of the workbench page (focusin, focusout and the window's blur and
 * focus, last 30) so a later dump can name what took the focus, and the same in every webview
 * host frame: the ones attached now and each one that loads later (`framenavigated`). Listeners
 * only; installing twice keeps one trace per document. Best-effort and bounded like the collector.
 */
export async function installWorkbenchFocusTrace(page: EvaluatingPage, timeoutMs: number = WORKBENCH_FOCUS_DUMP_TIMEOUT_MS): Promise<void> {
  await installTraceIn(page, timeoutMs);
  try {
    page.on?.("framenavigated", (frame) => {
      if (isWebviewHostFrameUrl(frame.url())) void installTraceIn(frame, timeoutMs);
    });
    const frames = page.frames?.().filter((frame) => isWebviewHostFrameUrl(frame.url())) ?? [];
    await Promise.all(frames.map((frame) => installTraceIn(frame, timeoutMs)));
  } catch {
    // Diagnostics only: the main window keeps its trace.
  }
}

// The two functions below run in the workbench page (serialised by Playwright): self-contained,
// no imports, no closures over this module.

function installFocusTraceInPage(): void {
  const holder = window as unknown as { __studioWorkbenchFocusTrace?: Array<{ at: number; type: string; target: string }> };
  if (holder.__studioWorkbenchFocusTrace !== undefined) return;
  const entries: Array<{ at: number; type: string; target: string }> = [];
  holder.__studioWorkbenchFocusTrace = entries;
  const describe = (node: EventTarget | null): string => {
    if (node === window) return "window";
    if (!(node instanceof Element)) return String(node);
    const part = node.closest("[id^='workbench.parts.']")?.id.slice("workbench.parts.".length);
    const classes = String(node.className).split(/\s+/u).filter(Boolean).slice(0, 4).map((name) => `.${name}`).join("");
    const label = node.getAttribute("aria-label");
    return `${node.tagName.toLowerCase()}${node.id ? `#${node.id}` : ""}${classes}`
      + (label ? `[aria-label=${JSON.stringify(label.slice(0, 60))}]` : "") + (part ? ` in ${part}` : "");
  };
  const record = (type: string, target: string): void => {
    entries.push({ at: performance.now(), type, target });
    if (entries.length > 30) entries.shift();
  };
  document.addEventListener("focusin", (event) => record("focusin", describe(event.target)), true);
  document.addEventListener("focusout", (event) =>
    record("focusout", `${describe(event.target)} -> ${describe((event as FocusEvent).relatedTarget)}`), true);
  window.addEventListener("blur", () => record("window-blur", `active ${describe(document.activeElement)}`));
  window.addEventListener("focus", () => record("window-focus", `active ${describe(document.activeElement)}`));
}

function readFrameFocusInPage(): WebviewHostFrameSnapshot {
  const element = (node: Element) => {
    const label = node.getAttribute("aria-label");
    const role = node.getAttribute("role");
    return {
      tag: node.tagName.toLowerCase(),
      ...(node.id ? { id: node.id } : {}),
      classes: String(node.className).split(/\s+/u).filter(Boolean),
      ...(role ? { role } : {}),
      ...(label ? { ariaLabel: label } : {}),
    };
  };
  const active = document.activeElement;
  const ancestors = [];
  for (let node = active?.parentElement ?? null; node !== null && node !== document.documentElement; node = node.parentElement) {
    ancestors.push(element(node));
  }
  const trace = (window as unknown as { __studioWorkbenchFocusTrace?: Array<{ at: number; type: string; target: string }> })
    .__studioWorkbenchFocusTrace;
  const now = performance.now();
  return {
    hasFocus: document.hasFocus(),
    visibility: document.visibilityState,
    activeElement: active ? element(active) : null,
    ancestors,
    ...(trace ? { focusTrace: trace.map((entry) => ({ ago: Math.round(now - entry.at), type: entry.type, target: entry.target })) } : {}),
  };
}

function readWorkbenchSnapshotInPage(): WorkbenchFocusSnapshot {
  const element = (node: Element) => {
    const label = node.getAttribute("aria-label");
    const role = node.getAttribute("role");
    const context = node.getAttribute("data-keybinding-context");
    return {
      tag: node.tagName.toLowerCase(),
      ...(node.id ? { id: node.id } : {}),
      classes: String(node.className).split(/\s+/u).filter(Boolean),
      ...(role ? { role } : {}),
      ...(label ? { ariaLabel: label } : {}),
      ...(context ? { keybindingContext: context } : {}),
    };
  };
  const shown = (node: Element | null): boolean => {
    if (node === null) return false;
    const box = node.getBoundingClientRect();
    return box.width > 0 && box.height > 0 && getComputedStyle(node).visibility !== "hidden";
  };
  const text = (node: Element | null | undefined): string => (node?.textContent ?? "").replace(/\s+/gu, " ").trim();
  const active = document.activeElement;
  const ancestors = [];
  for (let node = active?.parentElement ?? null; node !== null && node !== document.documentElement; node = node.parentElement) {
    ancestors.push(element(node));
  }
  const parts = Array.from(document.querySelectorAll("[id^='workbench.parts.']")).map((part) => {
    const title = text(part.querySelector(".composite.title .title-label"))
      || (part.querySelector(".composite-bar .action-item.checked .action-label")?.getAttribute("aria-label") ?? "");
    return { name: part.id.slice("workbench.parts.".length), visible: shown(part), ...(title ? { title: title.slice(0, 80) } : {}) };
  });
  const quickInput = document.querySelector(".quick-input-widget");
  const quickTitle = text(quickInput?.querySelector(".quick-input-title"));
  const activeTab = document.querySelector("#workbench\\.parts\\.editor .tab.active");
  const trace = (window as unknown as { __studioWorkbenchFocusTrace?: Array<{ at: number; type: string; target: string }> })
    .__studioWorkbenchFocusTrace;
  const now = performance.now();
  const chatWidgets = Array.from(document.querySelectorAll(".interactive-session"));
  return {
    hasFocus: document.hasFocus(),
    visibility: document.visibilityState,
    activeElement: active ? element(active) : null,
    ancestors,
    parts,
    ...(activeTab ? { activeEditorTab: activeTab.getAttribute("aria-label") ?? text(activeTab) } : {}),
    quickInput: { visible: shown(quickInput), ...(quickTitle ? { title: quickTitle } : {}) },
    toasts: Array.from(document.querySelectorAll(".notifications-toasts .notification-toast")).filter(shown).map((toast) => {
      const source = text(toast.querySelector(".notification-list-item-source"));
      return { message: text(toast.querySelector(".notification-list-item-message")), ...(source ? { source } : {}) };
    }),
    notificationCenterVisible: shown(document.querySelector(".notifications-center.visible")),
    dialogs: Array.from(document.querySelectorAll(".monaco-dialog-box")).filter(shown)
      .map((dialog) => text(dialog.querySelector(".dialog-message-text")) || text(dialog)),
    contextViewVisible: Array.from(document.querySelectorAll(".context-view")).some((view) => shown(view) && view.childElementCount > 0),
    chat: { widgets: chatWidgets.length, visible: chatWidgets.filter(shown).length },
    ...(trace ? { focusTrace: trace.map((entry) => ({ ago: Math.round(now - entry.at), type: entry.type, target: entry.target })) } : {}),
  };
}
