import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
  collectWebviewHostFrames,
  collectWorkbenchFocusSnapshot,
  describeWebviewFrameUrl,
  type DumpFrame,
  explainMissingHostFrames,
  focusedWorkbenchPart,
  formatWebviewHostFrames,
  formatWorkbenchFocusDump,
  installWorkbenchFocusTrace,
  isWebviewHostFrameUrl,
  withFocusDumpOnFailure,
  workbenchFocusDump,
  type WebviewHostFrameSnapshot,
  type WorkbenchElement,
  type WorkbenchFocusSnapshot,
} from "../shared/workbenchFocusDump";

const el = (tag: string, classes: string[] = [], extra: Partial<WorkbenchElement> = {}): WorkbenchElement =>
  ({ tag, classes, ...extra });

/** The state the alert-dropdown failure suggests: the chat input took the focus from the webview. */
const CHAT_STOLE_FOCUS: WorkbenchFocusSnapshot = {
  hasFocus: true,
  visibility: "visible",
  activeElement: el("textarea", ["inputarea", "monaco-mouse-cursor-text"], { ariaLabel: "Chat Input" }),
  ancestors: [
    el("div", ["monaco-editor", "focused"], { role: "code" }),
    el("div", ["interactive-input-part"]),
    el("div", ["interactive-session"], { keybindingContext: "12" }),
    el("div", ["part", "auxiliarybar"], { id: "workbench.parts.auxiliarybar", role: "complementary" }),
    el("body"),
  ],
  parts: [
    { name: "editor", visible: true },
    { name: "auxiliarybar", visible: true, title: "Chat" },
    { name: "panel", visible: false },
  ],
  activeEditorTab: "realinput-t25.md",
  quickInput: { visible: false },
  toasts: [{ message: "Sign in to use AI features.", source: "GitHub Copilot Chat" }],
  notificationCenterVisible: false,
  dialogs: [],
  contextViewVisible: false,
  chat: { widgets: 1, visible: 1 },
  focusTrace: [
    { ago: 1250, type: "focusin", target: "iframe.webview.ready in editor" },
    { ago: 40, type: "focusout", target: "iframe.webview.ready -> textarea.inputarea in auxiliarybar" },
    { ago: 40, type: "focusin", target: "textarea.inputarea in auxiliarybar" },
  ],
};

test("the focused part names the workbench part and the widget that hold the focus", () => {
  assert.equal(focusedWorkbenchPart(CHAT_STOLE_FOCUS), "auxiliary bar > chat");
  assert.equal(focusedWorkbenchPart({ activeElement: el("iframe", ["webview", "ready"]), ancestors: [
    el("div", ["webview", "ready"]), el("div", [], { id: "workbench.parts.editor" }), el("body")] }), "editor > webview");
  assert.equal(focusedWorkbenchPart({ activeElement: el("iframe", ["webview"]), ancestors: [el("body")] }), "webview");
  assert.equal(focusedWorkbenchPart({ activeElement: el("textarea", ["inputarea"]), ancestors: [
    el("div", ["monaco-editor", "focused"]), el("div", [], { id: "workbench.parts.panel" })] }), "panel > code editor");
  assert.equal(focusedWorkbenchPart({ activeElement: el("a", ["action-label"]), ancestors: [
    el("div", ["notification-toast"]), el("div", ["notifications-toasts", "visible"]), el("body")] }), "notification toast");
  assert.equal(focusedWorkbenchPart({ activeElement: el("input"), ancestors: [
    el("div", ["quick-input-widget"]), el("body")] }), "quick input");
  assert.equal(focusedWorkbenchPart({ activeElement: el("button"), ancestors: [el("div", ["monaco-dialog-box"])] }), "dialog");
  assert.equal(focusedWorkbenchPart({ activeElement: el("body"), ancestors: [] }), "none (document body)");
  assert.equal(focusedWorkbenchPart({ activeElement: null, ancestors: [] }), "none (no active element)");
});

test("the dump lists focus, parts, toasts and the recent focus moves, one fact per line", () => {
  const dump = formatWorkbenchFocusDump({ snapshot: CHAT_STOLE_FOCUS });
  assert.deepEqual(dump.split("\n"), [
    "Workbench focus (main window, read over CDP):",
    "  focused part: auxiliary bar > chat",
    "  active element: textarea.inputarea.monaco-mouse-cursor-text[aria-label=\"Chat Input\"]",
    "  ancestors (nearest first): div.monaco-editor.focused[role=code] < div.interactive-input-part"
      + " < div.interactive-session[context=12] < div#workbench.parts.auxiliarybar.part.auxiliarybar[role=complementary] < body",
    "  document: hasFocus=true visibility=visible",
    "  focus context keys: not reachable from the page (internal service); see the focused part",
    "  visible parts: editor, auxiliary bar (Chat); hidden: panel",
    "  active editor tab: realinput-t25.md",
    "  chat widgets: 1 visible of 1",
    "  quick input: hidden",
    "  notification toasts: \"Sign in to use AI features.\" (GitHub Copilot Chat)",
    "  notification center: hidden",
    "  dialogs: none",
    "  context menu or hover: none",
    "  recent focus moves (oldest first):",
    "    -1250 ms focusin iframe.webview.ready in editor",
    "    -40 ms focusout iframe.webview.ready -> textarea.inputarea in auxiliarybar",
    "    -40 ms focusin textarea.inputarea in auxiliarybar",
  ]);
});

test("a long ancestor path is cut, and a window without the trace says so", () => {
  const ancestors = Array.from({ length: 15 }, (_, index) => el("div", [`level-${index}`]));
  const dump = formatWorkbenchFocusDump({ snapshot: { ...CHAT_STOLE_FOCUS, ancestors, focusTrace: undefined } });
  assert.match(dump, /div\.level-11 < \.\.\. \(3 more\)/u);
  assert.doesNotMatch(dump, /level-12/u);
  assert.match(dump, /recent focus moves: not recorded \(no trace installed in this window\)/u);
});

test("the collector never throws and never waits past its bound", async () => {
  assert.equal(await workbenchFocusDump(undefined),
    "Workbench focus (main window, read over CDP): unavailable: no workbench page attached\n"
    + "Webview host frames (outer index.html around each webview content frame, read over CDP):"
    + " unavailable: no workbench page attached");
  const throwing = { evaluate: async () => { throw new Error("Target page, context or browser has been closed\nmore"); } };
  assert.deepEqual(await collectWorkbenchFocusSnapshot(throwing as never),
    { unavailable: "Target page, context or browser has been closed" });
  const synchronousThrow = { evaluate: () => { throw new Error("not connected"); } };
  assert.deepEqual(await collectWorkbenchFocusSnapshot(synchronousThrow as never), { unavailable: "not connected" });
  // A page that never answers, then rejects late: the dump says so within the bound, nothing unhandled.
  let rejectLate: (error: Error) => void = () => undefined;
  const hanging = { evaluate: () => new Promise((_, reject) => { rejectLate = reject; }) };
  const started = Date.now();
  assert.deepEqual(await collectWorkbenchFocusSnapshot(hanging as never, 30),
    { unavailable: "the page did not answer within 30 ms" });
  assert.ok(Date.now() - started < 1_000);
  rejectLate(new Error("closed"));
  await installWorkbenchFocusTrace(hanging as never, 30);
  await installWorkbenchFocusTrace(throwing as never, 30);
  const answering = { evaluate: async () => CHAT_STOLE_FOCUS };
  assert.deepEqual(await collectWorkbenchFocusSnapshot(answering as never), { snapshot: CHAT_STOLE_FOCUS });
});

const HOST_URL = "vscode-webview://163nutima95pbngdefp/index.html?id=c8f4121a-1922&parentId=1"
  + "&extensionId=GaetanSemet.markdown-okf-schema-studio&platform=electron";
const CONTENT_URL = "vscode-webview://163nutima95pbngdefp/fake.html?id=c8f4121a-1922";
const WORKBENCH_URL = "vscode-file://vscode-app/out/vs/code/electron-browser/workbench/workbench.html";

/** The alert-dropdown failure seen from the outer webview frame: its body took the focus from the content frame. */
const HOST_LOST_CONTENT: WebviewHostFrameSnapshot = {
  hasFocus: true,
  visibility: "visible",
  activeElement: el("body"),
  ancestors: [],
  focusTrace: [
    { ago: 900, type: "focusin", target: "iframe#active-frame" },
    { ago: 70, type: "focusout", target: "iframe#active-frame -> null" },
  ],
};

test("only the outer index.html of a webview is a host frame, named by its id and extension", () => {
  assert.equal(isWebviewHostFrameUrl(HOST_URL), true);
  assert.equal(isWebviewHostFrameUrl("vscode-webview://abc/index.html"), true);
  assert.equal(isWebviewHostFrameUrl(CONTENT_URL), false);
  assert.equal(isWebviewHostFrameUrl(WORKBENCH_URL), false);
  assert.equal(isWebviewHostFrameUrl("vscode-webview://abc/index.html.map"), false);
  assert.equal(describeWebviewFrameUrl(HOST_URL), "index.html id=c8f4121a-1922 extension=GaetanSemet.markdown-okf-schema-studio");
  assert.equal(describeWebviewFrameUrl("vscode-webview://abc/index.html"), "index.html");
  assert.equal(describeWebviewFrameUrl("not a url"), "not a url");
});

test("the host frame dump gives focus, active element path and focus moves per frame", () => {
  const dump = formatWebviewHostFrames([
    { url: HOST_URL, result: { snapshot: HOST_LOST_CONTENT } },
    { url: "vscode-webview://other/index.html?id=b", result: { snapshot: {
      hasFocus: false, visibility: "hidden", activeElement: el("iframe", [], { id: "active-frame" }),
      ancestors: [el("body")] } } },
    { url: "vscode-webview://late/index.html?id=c", result: { unavailable: "the frame did not answer within 30 ms" } },
  ]);
  assert.deepEqual(dump.split("\n"), [
    "Webview host frames (outer index.html around each webview content frame, read over CDP):",
    "  index.html id=c8f4121a-1922 extension=GaetanSemet.markdown-okf-schema-studio:",
    "    document: hasFocus=true visibility=visible",
    "    active element: body",
    "    ancestors (nearest first): none",
    "    recent focus moves (oldest first):",
    "      -900 ms focusin iframe#active-frame",
    "      -70 ms focusout iframe#active-frame -> null",
    "  index.html id=b:",
    "    document: hasFocus=false visibility=hidden",
    "    active element: iframe#active-frame",
    "    ancestors (nearest first): body",
    "    recent focus moves: not recorded (no trace installed in this frame)",
    "  index.html id=c:",
    "    unavailable: the frame did not answer within 30 ms",
  ]);
  assert.equal(formatWebviewHostFrames([]),
    "Webview host frames (outer index.html around each webview content frame, read over CDP): none attached");
  assert.equal(formatWebviewHostFrames({ unavailable: "the page lists no frames" }),
    "Webview host frames (outer index.html around each webview content frame, read over CDP):"
    + " unavailable: the page lists no frames");
});

test("the host frames are read from the page's frames only, never throwing, and the trace follows new ones", async () => {
  const evaluated: string[] = [];
  const frame = (url: string, answer: () => Promise<unknown>): DumpFrame => ({
    url: () => url,
    evaluate: (async () => { evaluated.push(url); return answer(); }) as never,
  });
  const frames = [
    frame(WORKBENCH_URL, async () => CHAT_STOLE_FOCUS),
    frame(HOST_URL, async () => HOST_LOST_CONTENT),
    frame(CONTENT_URL, async () => ({})),
    frame("vscode-webview://gone/index.html?id=gone", async () => { throw new Error("Frame was detached\nstack"); }),
  ];
  let navigated: ((frame: DumpFrame) => void) | undefined;
  const page = {
    evaluate: (async () => CHAT_STOLE_FOCUS) as never,
    frames: () => frames,
    on: (_event: "framenavigated", listener: (frame: DumpFrame) => void) => { navigated = listener; },
  };
  assert.deepEqual(await collectWebviewHostFrames(page), [
    { url: HOST_URL, result: { snapshot: HOST_LOST_CONTENT } },
    { url: "vscode-webview://gone/index.html?id=gone", result: { unavailable: "Frame was detached" } },
  ]);
  assert.deepEqual(evaluated, [HOST_URL, "vscode-webview://gone/index.html?id=gone"]);
  assert.deepEqual(await collectWebviewHostFrames({ evaluate: page.evaluate }), { unavailable: "the page lists no frames" });
  assert.deepEqual(await collectWebviewHostFrames({ evaluate: page.evaluate, frames: () => { throw new Error("closed"); } }),
    { unavailable: "closed" });
  const dump = await workbenchFocusDump(page);
  assert.match(dump, /^Workbench focus \(main window, read over CDP\):\n {2}focused part: auxiliary bar > chat/u);
  assert.match(dump, /\nWebview host frames .*\n {2}index\.html id=c8f4121a-1922 .*\n {4}document: hasFocus=true/u);

  // The trace goes into the host frames attached now and each one that loads later, never elsewhere.
  evaluated.length = 0;
  await installWorkbenchFocusTrace(page, 30);
  assert.deepEqual(evaluated, [HOST_URL, "vscode-webview://gone/index.html?id=gone"]);
  evaluated.length = 0;
  navigated?.(frame(CONTENT_URL, async () => undefined));
  navigated?.(frame("vscode-webview://new/index.html?id=new", async () => undefined));
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(evaluated, ["vscode-webview://new/index.html?id=new"]);
});

test("an empty host frame section says why: no webview open, or webview frames without a recognised host", () => {
  assert.equal(explainMissingHostFrames([WORKBENCH_URL]), "no webview is open (1 frame(s) in the page: workbench.html)");
  assert.equal(explainMissingHostFrames([]), "no webview is open (0 frame(s) in the page: none)");
  assert.equal(explainMissingHostFrames([WORKBENCH_URL, CONTENT_URL]),
    "webview frames without a recognised index.html host frame"
    + " (2 frame(s) in the page: workbench.html, webview fake.html id=c8f4121a-1922)");
  assert.equal(formatWebviewHostFrames([], [WORKBENCH_URL]),
    "Webview host frames (outer index.html around each webview content frame, read over CDP):"
    + " none attached: no webview is open (1 frame(s) in the page: workbench.html)");
});

/**
 * The CI failure (stress, slash menu): the suite's handler read the dump after the scenario's
 * cleanup had closed the preview, so it showed the empty editor group and "none attached". A dump
 * read when the step fails, before that cleanup, still has the webview host frame.
 */
test("a dump read at the failing step keeps the webview host frame the later cleanup closes", async () => {
  const workbench: DumpFrame = { url: () => WORKBENCH_URL, evaluate: (async () => CHAT_STOLE_FOCUS) as never };
  const host: DumpFrame = { url: () => HOST_URL, evaluate: (async () => HOST_LOST_CONTENT) as never };
  const content: DumpFrame = { url: () => CONTENT_URL, evaluate: (async () => ({})) as never };
  let frames = [workbench, host, content];
  const page = { evaluate: (async () => CHAT_STOLE_FOCUS) as never, frames: () => frames };
  const closeEditors = (): void => { frames = [workbench]; };

  const recorded: string[] = [];
  const failure = new Error("Timed out waiting for the menu to open for /tab.");
  await assert.rejects(async () => {
    try {
      await withFocusDumpOnFailure(page, async () => { throw failure; }, (dump) => recorded.push(dump), 30);
    } finally {
      closeEditors();
    }
  }, (error: unknown) => error === failure);
  assert.equal(recorded.length, 1);
  assert.match(recorded[0]!, /\nWebview host frames .*:\n {2}index\.html id=c8f4121a-1922 extension=GaetanSemet/u);

  // Read after the cleanup, as the suite's handler did: the section explains its emptiness.
  assert.match(await workbenchFocusDump(page, 30),
    /\nWebview host frames .*: none attached: no webview is open \(1 frame\(s\) in the page: workbench\.html\)$/u);

  // A passing step records nothing; without a page the step only runs.
  assert.equal(await withFocusDumpOnFailure(page, async () => 42, (dump) => recorded.push(dump)), 42);
  await assert.rejects(withFocusDumpOnFailure(undefined, async () => { throw failure; }, (dump) => recorded.push(dump)),
    (error: unknown) => error === failure);
  assert.equal(recorded.length, 1);
});
