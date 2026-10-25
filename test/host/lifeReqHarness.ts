/**
 * A host harness for the lifecycle requirement tests: the real `StudioActivation` against the fake
 * `vscode` module, with the seams the other host harness keeps private. It exposes the activation
 * (so a test reaches the manager and its sessions), the custom editor provider and the panel
 * serializer the activation registers, the options the panels were created with, and the file
 * watchers by their pattern. Timers run on the `node:test` mock clock; renders are real.
 */
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { MockTimers } from "node:test";

import { RUNTIME_CONTEXT_ATTRIBUTE } from "../../src/core/protocol/bootContext";
import { identityOf, type PageIdentity } from "../shared/previewIdentity";
import { createFakeVscode, Disposable, FakeTextDocument, missingMembers, Uri, type Emitter, type FakeWebviewPanel } from "./fakeVscode";

/** The workspace folder of the fake host. */
export const workspaceRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "studio-life-")));
/** A folder outside every workspace folder. */
export const outsideRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "studio-life-outside-")));
process.on("exit", () => {
  fs.rmSync(workspaceRoot, { recursive: true, force: true });
  fs.rmSync(outsideRoot, { recursive: true, force: true });
});

export const fake = createFakeVscode({ workspaceRoot });

// The activation imports "vscode" at load time: this process gets the fake for good.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const nodeModule = require("node:module") as { _load: (request: string, ...rest: unknown[]) => unknown };
const originalLoad = nodeModule._load;
nodeModule._load = function load(request: string, ...rest: unknown[]): unknown {
  return request === "vscode" ? fake.vscode : originalLoad.call(this, request, ...rest);
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const activationModule = require("../../src/host-vscode/activation") as typeof import("../../src/host-vscode/activation");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const renderModule = require("../../src/core/render/renderPipeline") as typeof import("../../src/core/render/renderPipeline");

export const { COMMAND_ID, REFRESH_COMMAND_ID, StudioActivation } = activationModule;
export const { setRenderOverrideForTests, resetRenderHooksForTests } = renderModule;
export { FakeTextDocument, Uri };
export type { FakeWebviewPanel, PageIdentity };

/** The identity of the runtime context carried by an assigned webview document, if it has one. */
export function identityOfDocument(html: string): PageIdentity | undefined {
  const match = new RegExp(`<script[^>]*${RUNTIME_CONTEXT_ATTRIBUTE}[^>]*>([^<]*)</script>`, "u").exec(html);
  return match ? identityOf(JSON.parse(match[1]!) as Record<string, unknown>) : undefined;
}

/** The part of the fake file watcher the tests drive. */
export interface WatcherLike {
  readonly changed: Emitter<Uri>;
  readonly created: Emitter<Uri>;
  readonly deleted: Emitter<Uri>;
  readonly disposed: boolean;
}

type CustomEditorProvider = {
  resolveCustomTextEditor(document: unknown, panel: unknown): Promise<void> | void;
};
type PanelSerializer = { deserializeWebviewPanel(panel: unknown, state: unknown): Promise<void> | void };

/** What the activation registered or created through the fake `vscode` module. */
export const captured = {
  provider: undefined as CustomEditorProvider | undefined,
  editorOptions: undefined as { webviewOptions?: { retainContextWhenHidden?: boolean } } | undefined,
  serializer: undefined as PanelSerializer | undefined,
  panelOptions: [] as Array<Record<string, unknown>>,
  /** Every file watcher with the pattern it was created for. */
  watchers: [] as Array<{ watcher: WatcherLike; base?: string; pattern: string }>,
};

const windowApi = fake.vscode.window as unknown as Record<string, unknown>;
windowApi.registerCustomEditorProvider = (_type: string, provider: CustomEditorProvider, options: typeof captured.editorOptions) => {
  captured.provider = provider;
  captured.editorOptions = options;
  return new Disposable(() => undefined);
};
windowApi.registerWebviewPanelSerializer = (_type: string, serializer: PanelSerializer) => {
  captured.serializer = serializer;
  return new Disposable(() => undefined);
};
const createPanel = windowApi.createWebviewPanel as (...args: unknown[]) => FakeWebviewPanel;
windowApi.createWebviewPanel = (...args: unknown[]) => {
  captured.panelOptions.push((args[3] ?? {}) as Record<string, unknown>);
  return createPanel(...args);
};
const workspaceApi = fake.vscode.workspace as unknown as Record<string, unknown>;
const createWatcher = workspaceApi.createFileSystemWatcher as (pattern: unknown) => WatcherLike;
workspaceApi.createFileSystemWatcher = (pattern: unknown) => {
  const watcher = createWatcher(pattern);
  const relative = pattern as { base?: { fsPath?: string }; pattern?: string };
  captured.watchers.push(typeof pattern === "string"
    ? { watcher, pattern }
    : { watcher, base: relative.base?.fsPath, pattern: String(relative.pattern) });
  return watcher;
};

export type Studio = ReturnType<typeof startStudio>;

async function turn(): Promise<void> {
  await new Promise<void>((resolve) => setImmediate(resolve));
}

let fileCounter = 0;

/** Writes a Markdown file below `directory` (default: the workspace folder) and returns its path. */
export function writeFile(text: string, directory = workspaceRoot, name?: string): string {
  fileCounter += 1;
  const filePath = path.join(directory, name ?? `life-${process.pid}-${fileCounter}.md`);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text, "utf8");
  return filePath;
}

/** A started activation of the extension over the fake host. */
export function startStudio(timers: MockTimers, options: { trusted?: boolean } = {}) {
  timers.enable({ apis: ["setTimeout"] });
  windowApi.activeTextEditor = undefined;
  windowApi.visibleTextEditors = [];
  (fake.vscode.workspace as unknown as { isTrusted: boolean }).isTrusted = options.trusted ?? true;
  captured.panelOptions.length = 0;
  const context = fake.controls.context();
  const activation = new StudioActivation(context.extensionUri as never);
  activation.start(context as never);
  const manager = activation.manager;
  const panelsBefore = fake.controls.panels.length;
  const watchersBefore = captured.watchers.length;

  const until = async (condition: () => boolean, label: string): Promise<void> => {
    const deadline = performance.now() + 30_000;
    while (!condition()) {
      assert.deepEqual([...missingMembers], [], "the extension used members the fake vscode module lacks");
      assert.ok(performance.now() < deadline, `timed out waiting for: ${label}`);
      await turn();
      timers.tick(0);
    }
  };
  const settle = async (): Promise<void> => {
    for (let index = 0; index < 200; index += 1) await turn();
  };
  /** Moves the clock in small steps so a render that starts on a timer can finish in between. */
  const advance = async (ms: number): Promise<void> => {
    for (let moved = 0; moved < ms; moved += 10) {
      timers.tick(Math.min(10, ms - moved));
      for (let index = 0; index < 20; index += 1) await turn();
    }
    await settle();
  };

  const studio = {
    activation,
    manager,
    context,
    timers,
    until,
    settle,
    advance,
    /** Panels created since this activation started. */
    panels: (): FakeWebviewPanel[] => fake.controls.panels.slice(panelsBefore),
    show: (filePath: string): Promise<FakeTextDocument> => fake.controls.showDocument(filePath),
    runCommand: (id: string, ...args: unknown[]): Promise<unknown> => {
      const registered = fake.controls.commands.get(id);
      assert.ok(registered, `the command ${id} is registered`);
      return Promise.resolve(registered(...args));
    },
    /** The dependency watchers (the `**` watchers of a resource root) created since the start, oldest first. */
    dependencyWatchers: (root: string): WatcherLike[] => captured.watchers.slice(watchersBefore)
      .filter((entry) => entry.pattern === "**/*" && entry.base === root).map((entry) => entry.watcher),
    /** The newest dependency watcher of a resource root. */
    dependencyWatcherOf: (root: string): WatcherLike => studio.dependencyWatchers(root).at(-1)!,
    /** The page reports ready for `identity` (by default the last rendered document's). */
    async ready(panel: FakeWebviewPanel, identity?: PageIdentity, extra: Record<string, unknown> = {}): Promise<void> {
      const target = identity ?? [...panel.htmlAssignments].reverse().map(identityOfDocument).find((value) => value !== undefined);
      assert.ok(target, "a rendered document was assigned");
      panel.fromPage.fire({
        type: "previewReady", ...target, sourceLine: 1, scrollTop: 0, descriptionsCollapsed: false, blockEditOpen: false, ...extra,
      });
      await turn();
    },
    /** Opens the file in the editor and runs Open Preview to Side; resolves once it rendered. */
    async openSide(filePath: string): Promise<{ document: FakeTextDocument; panel: FakeWebviewPanel }> {
      const document = await fake.controls.showDocument(filePath);
      const before = fake.controls.panels.length;
      void studio.runCommand(COMMAND_ID);
      await until(() => fake.controls.panels.length > before, "the preview panel");
      const panel = fake.controls.panels.at(-1)!;
      await studio.renderDone(panel);
      return { document, panel };
    },
    /** Moves the clock until the panel holds a rendered page document. */
    async renderDone(panel: FakeWebviewPanel): Promise<void> {
      const rendered = (): boolean => panel.htmlAssignments.some((html) => html.includes("data-sphinx-source-line"));
      for (let step = 0; step < 100 && !rendered(); step += 1) {
        timers.tick(50);
        for (let index = 0; index < 50 && !rendered(); index += 1) await turn();
      }
      await until(rendered, "the first rendered page");
    },
    close(): void {
      activation.stop();
      for (const subscription of context.subscriptions.splice(0)) subscription.dispose();
      for (const panel of fake.controls.panels) panel.dispose();
      timers.reset();
      resetRenderHooksForTests();
    },
  };
  return studio;
}
