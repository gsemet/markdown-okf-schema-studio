/** Shared host fixture of the block editing session tests: a real `PreviewManager` over an in-memory document. */

import type { TextEdit } from "../../src/core/edits/textEdit";
import type { HostServices } from "../../src/host-api/index";
import { nodeHostPorts } from "./nodeHostPorts";
import type { PanelGroups } from "../../src/host-api/previewPanel";
import { createMemoryDocumentStore } from "../../src/host-memory/memoryDocumentStore";
import { PreviewManager } from "../../src/session/previewManager";
import { PreviewSession } from "../../src/session/previewSession";

export const MARKDOWN = "# Title\n\nFirst paragraph.\n\nSecond paragraph.\n";

/** Lets promise chains run. */
export async function settle(): Promise<void> {
  for (let index = 0; index < 20; index += 1) {
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
}

export interface Deferred<T> {
  promise: Promise<T>;
  resolve(value: T): void;
}

export function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

export interface FixtureOptions {
  restrictedReads?: boolean;
  text?: string;
}

/** A preview over an in-memory document, with hooks on the edits and the clipboard. */
export function fixture(options: FixtureOptions = {}) {
  const store = createMemoryDocumentStore();
  const document = store.add("file:///w/a.md", options.text ?? MARKDOWN, "/w/a.md");
  const applyCalls: Array<readonly TextEdit[]> = [];
  const hooks = {
    gate: undefined as Promise<void> | undefined,
    rejectWith: undefined as Error | undefined,
    /** A file VS Code holds read-only: it accepts an edit and changes nothing. */
    readOnly: false,
    readClipboard: (): Promise<string> => Promise.resolve("Pasted block.\n"),
    writeClipboard: (_text: string): Promise<void> => Promise.resolve(),
  };
  const documents = Object.assign(Object.create(store) as object, {
    applyEdits: (target: typeof document, edits: readonly TextEdit[], applyOptions?: never) => {
      applyCalls.push(edits);
      if (hooks.rejectWith) return Promise.reject(hooks.rejectWith);
      if (hooks.readOnly) return Promise.resolve(true);
      const outcome = Promise.resolve(store.applyEdits(target, edits, applyOptions));
      return hooks.gate ? hooks.gate.then(() => outcome) : outcome;
    },
  });
  const warnings: string[] = [];
  const deleted: string[] = [];
  const host = {
    ...nodeHostPorts,
    files: { delete: (file: string) => { deleted.push(file); return Promise.resolve(); } },
    documents,
    ui: {
      readClipboard: () => hooks.readClipboard(),
      writeClipboard: (text: string) => hooks.writeClipboard(text),
      showWarning: (text: string) => {
        warnings.push(text);
        return Promise.resolve(undefined);
      },
    },
  } as unknown as HostServices;
  const groups: PanelGroups = { lockNewPanelGroup: () => Promise.resolve(false), release: () => undefined };
  const manager = new PreviewManager(host, groups);
  const posted: Array<Record<string, unknown>> = [];
  const preview = new PreviewSession({
    panel: { postMessage: (message: Record<string, unknown>) => { posted.push(message); return Promise.resolve(true); } },
    followsActiveEditor: false,
    document,
    documentUri: document.id,
    workspaceRoot: "/w",
    sessionRoots: [],
    navigationRoots: [],
    workspaceFolder: undefined,
    restrictedReads: options.restrictedReads === true,
    webview: {},
    states: {},
    state: undefined,
    status: "success",
    configuration: {},
    plantUmlConfiguration: {},
    plantUmlEngineSettings: {},
    frontmatterConfiguration: {},
  } as never);
  const openRevision = document.revision;
  preview.stage = { activeDocumentIdentity: document.id, activeDocumentRevision: openRevision, requestId: 1 } as never;
  preview.page.readyRequestId = 1;
  (manager as unknown as { live: Set<PreviewSession> }).live.add(preview);
  manager.rendering.refreshPreviewDocument = () => Promise.resolve() as never;

  /** A page message for the render the preview holds. */
  const message = (type: string, extra: Record<string, unknown> = {}): Record<string, unknown> => ({
    type, documentId: document.id, revision: openRevision, requestId: 1, ...extra,
  });
  const send = async (type: string, extra: Record<string, unknown> = {}): Promise<void> => {
    await manager.handlePageMessage(preview, message(type, extra));
    await settle();
  };
  const of = (type: string): Array<Record<string, unknown>> => posted.filter((entry) => entry.type === type);
  return { store, document, applyCalls, hooks, manager, preview, posted, warnings, deleted, send, of, message };
}
