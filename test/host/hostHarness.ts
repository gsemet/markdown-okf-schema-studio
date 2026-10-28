/**
 * Runs the extension host in a unit test: `activate` against the fake `vscode` module, the Open
 * Preview command, and a scripted page that answers through the panel's message channel. Timers run
 * on the `node:test` mock clock, so a test moves time explicitly and every delay boundary is exact;
 * renders are real (in-process MyST) and are awaited by condition, never by sleeping.
 *
 * Only the public seams are used: the extension's `activate` / `deactivate`, its command id, the
 * text-document events and the webview messages. Nothing reaches into the extension's internals.
 */
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { MockTimers } from "node:test";

import { RUNTIME_CONTEXT_ATTRIBUTE } from "../../src/core/protocol/bootContext";
import { identityOf, type PageIdentity } from "../shared/previewIdentity";
import { freezeRenderClock, releaseRenderClock, wallNow } from "./renderClock";
import { createFakeVscode, missingMembers, type FakeTextDocument, type FakeWebviewPanel } from "./fakeVscode";

const workspaceRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "studio-host-")));
process.on("exit", () => fs.rmSync(workspaceRoot, { recursive: true, force: true }));

const fake = createFakeVscode({ workspaceRoot });

// The extension imports "vscode" at load time: this process gets the fake for good.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const nodeModule = require("node:module") as { _load: (request: string, ...rest: unknown[]) => unknown };
const originalLoad = nodeModule._load;
nodeModule._load = function load(request: string, ...rest: unknown[]): unknown {
  return request === "vscode" ? fake.vscode : originalLoad.call(this, request, ...rest);
};
// The harness drives the host on a mocked clock and expects a render to end within a few event-loop
// turns: renders stay in-process here (the worker thread has its own tests).
// eslint-disable-next-line @typescript-eslint/no-require-imports
(require("../../src/node-services/renderWorker") as typeof import("../../src/node-services/renderWorker"))
  .setRenderWorkersEnabledForTests(false);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const extension = require("../../src/extension") as {
  activate(context: unknown): void;
  deactivate(): void;
};

/** The command that opens the side preview (package.json `contributes.commands`). */
export const OPEN_PREVIEW_COMMAND = "markdown-okf-schema-studio.openPreview";

export type { PageIdentity };

/** The identity of the runtime context carried by an assigned webview document, if it has one. */
export function identityOfDocument(html: string): PageIdentity | undefined {
  const match = new RegExp(`<script[^>]*${RUNTIME_CONTEXT_ATTRIBUTE}[^>]*>([^<]*)</script>`, "u").exec(html);
  if (!match) return undefined;
  return identityOf(JSON.parse(match[1]!) as Record<string, unknown>);
}

let fileCounter = 0;

/** One activated extension with one open side preview over one Markdown file. */
export interface HostSession {
  readonly document: FakeTextDocument;
  readonly panel: FakeWebviewPanel;
  readonly timers: MockTimers;
  /** Messages the host posted to the page, in order. */
  readonly posted: Array<Record<string, unknown>>;
  /** Webview documents the host assigned, in order (each one is a page load). */
  readonly assignments: string[];
  /** The identity of the last assigned document that carries a runtime context. */
  loadedIdentity(): PageIdentity;
  /** A message from the page, as the webview delivers it. */
  fromPage(message: Record<string, unknown>): Promise<void>;
  /** The page reports ready for `identity` (by default the last loaded document's). */
  ready(identity?: PageIdentity, extra?: Record<string, unknown>): Promise<void>;
  /** Types the whole new text into the editor (one change event, one new version). */
  type(text: string): void;
  /** Moves the mock clock. */
  tick(ms: number): void;
  /** Lets promise chains and in-process I/O run until `condition` holds (bounded, no sleeping). */
  until(condition: () => boolean, label: string): Promise<void>;
  /** Lets pending promise chains and I/O run for a while without a condition. */
  settle(): Promise<void>;
  /** Runs a registered command, as the palette or a keybinding would. */
  runCommand(id: string, ...args: unknown[]): Promise<unknown>;
  /** Messages of `type` posted since index `from`. */
  postedSince(from: number, type?: string): Array<Record<string, unknown>>;
}

async function turn(): Promise<void> {
  await new Promise<void>((resolve) => setImmediate(resolve));
}

/**
 * Activates the extension, opens `markdown` in the editor and runs Open Preview; resolves once the
 * first rendered document is assigned. The page has not reported ready yet.
 */
export async function openPreview(timers: MockTimers, markdown: string): Promise<HostSession> {
  fileCounter += 1;
  const filePath = path.join(workspaceRoot, `note-${process.pid}-${fileCounter}.md`);
  fs.writeFileSync(filePath, markdown, "utf8");
  timers.enable({ apis: ["setTimeout"] });
  // Render times count on the mock clock (none), so the debounce stays the one the test ticks.
  freezeRenderClock();
  const context = fake.controls.context();
  extension.activate(context);
  sessions.push({ context });
  const document = await fake.controls.showDocument(filePath);
  const panelsBefore = fake.controls.panels.length;
  const command = fake.controls.commands.get(OPEN_PREVIEW_COMMAND);
  assert.ok(command, "activate registers Open Preview");
  // Settles once the first render is requested, which needs the debounce to pass: not awaited.
  void Promise.resolve(command());
  /** The panel the waits report on, once it exists. */
  let opened: FakeWebviewPanel | undefined;
  const until = async (condition: () => boolean, label: string): Promise<void> => {
    const deadline = wallNow() + 30_000;
    while (!condition()) {
      assert.deepEqual([...missingMembers], [], "the extension used members the fake vscode module lacks");
      if (wallNow() >= deadline) assert.fail(`timed out waiting for: ${label}; ${hostState(opened)}`);
      await turn();
      // Timers already due run, as they would on a real event loop; the clock does not move.
      timers.tick(0);
    }
  };
  await until(() => fake.controls.panels.length > panelsBefore, "the preview panel");
  const panel = fake.controls.panels.at(-1)!;
  opened = panel;
  // The first render starts after the queue's debounce; the clock moves only when a test says so.
  const hasRenderedDocument = (): boolean => panel.htmlAssignments.some((html) => identityOfDocument(html) !== undefined);
  for (let step = 0; step < 100 && !hasRenderedDocument(); step += 1) {
    timers.tick(50);
    await until(() => true, "");
    for (let index = 0; index < 50 && !hasRenderedDocument(); index += 1) await turn();
  }
  await until(hasRenderedDocument, "the first rendered document");
  const session: HostSession = {
    document,
    panel,
    timers,
    posted: panel.posted,
    assignments: panel.htmlAssignments,
    loadedIdentity: () => {
      const identity = [...panel.htmlAssignments].reverse().map(identityOfDocument).find((value) => value !== undefined);
      assert.ok(identity, "a rendered document was assigned");
      return identity;
    },
    fromPage: async (message) => {
      panel.fromPage.fire(message);
      await turn();
    },
    ready: async (identity, extra = {}) => {
      const target = identity ?? session.loadedIdentity();
      panel.fromPage.fire({
        type: "previewReady",
        ...target,
        sourceLine: 1,
        scrollTop: 0,
        descriptionsCollapsed: false,
        blockEditOpen: false,
        ...extra,
      });
      await turn();
    },
    type: (text) => fake.controls.changeDocument(document, text),
    tick: (ms) => timers.tick(ms),
    until,
    settle: async () => {
      for (let index = 0; index < 200; index += 1) await turn();
    },
    runCommand: (id, ...args) => {
      const registered = fake.controls.commands.get(id);
      assert.ok(registered, `the command ${id} is registered`);
      return Promise.resolve(registered(...args));
    },
    postedSince: (from, type) => panel.posted.slice(from).filter((message) => type === undefined || message.type === type),
  };
  return session;
}

/** What the host had sent when a wait timed out: the page's messages and documents so far. */
function hostState(panel: FakeWebviewPanel | undefined): string {
  if (!panel) return `no preview panel (${fake.controls.panels.length} panel(s) in the process)`;
  const types = panel.posted.slice(-12).map((message) => String(message.type));
  return `${panel.htmlAssignments.length} document(s) assigned, ${panel.posted.length} message(s) posted, `
    + `the last ones: ${types.join(", ") || "none"}`;
}

const sessions: Array<{ context: { subscriptions: Array<{ dispose(): unknown }> } }> = [];

/** Deactivates the extension and drops every subscription of the sessions this process opened. */
export function closeHost(timers: MockTimers): void {
  extension.deactivate();
  assert.deepEqual([...missingMembers], [], "the extension used members the fake vscode module lacks");
  for (const { context } of sessions.splice(0)) {
    for (const subscription of context.subscriptions.splice(0)) subscription.dispose();
  }
  for (const panel of fake.controls.panels) panel.dispose();
  timers.reset();
  releaseRenderClock();
}
