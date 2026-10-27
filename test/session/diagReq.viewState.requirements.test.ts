/**
 * Requirement tests of the view choices a read-only preview may make (`ViewStateController`) and
 * of how the theme mode is kept when the workspace storage fails (`WorkspaceChoices`). The page
 * message dispatcher, the router and the choices are the real ones; the manager is a fake.
 */
import * as assert from "node:assert/strict";
import { mock, test } from "node:test";

import { createMessageRouter } from "../../src/core/protocol/router";
import type { PageToHostMessage } from "../../src/core/protocol/pageToHost";
import type { HostServices } from "../../src/host-api/index";
import type { KeyValueStore } from "../../src/host-api/keyValueStore";
import { createMemoryLogger, type MemoryLogger } from "../../src/host-memory/memoryLogger";
import { ViewStateController } from "../../src/session/features/viewState";
import { PageMessageDispatcher, type PageMessageRouter } from "../../src/session/pageMessages";
import { PreviewManager } from "../../src/session/previewManager";
import type { PreviewSession } from "../../src/session/previewSession";
import { WorkspaceChoices } from "../../src/session/workspaceChoices";
import { READ_ONLY_NO_FOLDER } from "../../src/core/edits/sourceEdits";

const DOCUMENT = "file:///notes/doc.md";

function memoryStore(): KeyValueStore & { values: Map<string, unknown> } {
  const values = new Map<string, unknown>();
  return {
    values,
    get: <T>(key: string) => values.get(key) as T | undefined,
    update: (key, value) => {
      if (value === undefined) values.delete(key); else values.set(key, value);
      return Promise.resolve();
    },
    keys: () => [...values.keys()],
  };
}

function readOnlyHarness() {
  const choices = new WorkspaceChoices({} as HostServices);
  choices.load(memoryStore());
  const errors: string[] = [];
  const session = {
    disposed: false,
    readOnly: true,
    documentUri: DOCUMENT,
    stage: { activeDocumentIdentity: DOCUMENT, activeDocumentRevision: 4, requestId: 9 },
    edits: { active: undefined },
    page: {},
    scroll: {},
  } as unknown as PreviewSession;
  const manager = {
    live: new Set<unknown>([session]),
    matchesCurrent: PreviewManager.prototype.matchesCurrent,
    has: () => true,
    choices,
    incoming: { schedule: () => undefined },
    edits: { postEditSourceError: (_preview: unknown, _message: unknown, text: string) => errors.push(text) },
    frontmatter: { postEditError: () => undefined },
  };
  const router = createMessageRouter() as unknown as PageMessageRouter;
  new ViewStateController(manager as unknown as PreviewManager).register(router);
  const dispatcher = new PageMessageDispatcher(manager as unknown as PreviewManager, router);
  const send = (message: Record<string, unknown>): unknown =>
    dispatcher.handle(session, { documentId: DOCUMENT, revision: 4, requestId: 9, ...message } as PageToHostMessage);
  return { choices, errors, send };
}

// @tests_req SwRS-MDOKFSTUDIO-TRUST-006
test("a read-only preview stores a zoom change, and a message of an older render is dropped", () => {
  const { choices, send } = readOnlyHarness();

  send({ type: "previewViewPreferenceChanged", preference: "zoom", value: 130 });
  assert.equal(choices.viewPreferences.zoom, 130);

  send({ type: "previewViewPreferenceChanged", preference: "zoom", value: 150, revision: 3 });
  assert.equal(choices.viewPreferences.zoom, 130, "the render gate drops a message with the old revision");
});

test("a read-only preview stores a theme choice; its edit requests are refused", () => {
  const { choices, errors, send } = readOnlyHarness();

  send({ type: "previewThemeModeChanged", previewThemeMode: "white" });
  assert.equal(choices.previewThemeMode, "white");
  assert.deepEqual(errors, []);

  send({ type: "previewEditOpen", line: 3, endLine: 4, editId: "e1" });
  assert.deepEqual(errors, [READ_ONLY_NO_FOLDER]);
  assert.equal(choices.previewThemeMode, "white");
});

const NOT_SAVED = "The Markdown preview could not save your display choice; it holds until VS Code closes.";

function failingStore(): KeyValueStore {
  return {
    get: () => undefined,
    update: () => Promise.reject(new Error("disk full")),
    keys: () => [],
  };
}

function hostWithWarnings(warnings: string[], logger: MemoryLogger = createMemoryLogger()): HostServices {
  return {
    logger,
    ui: { showWarning: (text: string) => { warnings.push(text); return Promise.resolve(); } },
  } as unknown as HostServices;
}

// @tests_req SwRS-MDOKFSTUDIO-LIFE-002
// @tests_req SwRS-MDOKFSTUDIO-LIFE-169
// @tests_req SwRS-MDOKFSTUDIO-LAYOUT-021
test("a view preference that cannot be saved holds for the session and warns the reader once", async () => {
  const log = createMemoryLogger();
  const warnings: string[] = [];
  const rejected = new WorkspaceChoices(hostWithWarnings(warnings, log));
  rejected.load(failingStore());
  rejected.setViewPreference("zoom", 130);
  rejected.setViewPreference("widthMode", "full");
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(rejected.viewPreferences.zoom, 130);
  assert.equal(rejected.viewPreferences.widthMode, "full");
  assert.equal(log.entries[0]!.message, "Failed to persist the Markdown preview view preferences.");
  assert.deepEqual(warnings, [NOT_SAVED], "one warning for a run of failures");
  mock.restoreAll();
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-169
test("a theme mode that cannot be saved still holds for the session", async () => {
  const log = createMemoryLogger();
  const warnings: string[] = [];
  const rejected = new WorkspaceChoices(hostWithWarnings(warnings, log));
  rejected.load(failingStore());
  rejected.setPreviewThemeMode("dark");
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(rejected.previewThemeMode, "dark");
  assert.equal(log.entries.length, 1);
  assert.equal(log.entries[0]!.message, "Failed to persist the Markdown preview theme mode.");
  assert.deepEqual(warnings, [NOT_SAVED]);

  const store = memoryStore();
  const unloaded = new WorkspaceChoices(hostWithWarnings(warnings));
  unloaded.setPreviewThemeMode("white");
  assert.equal(unloaded.previewThemeMode, "white");
  unloaded.load(store);
  unloaded.unload();
  unloaded.setPreviewThemeMode("cream");
  assert.equal(unloaded.previewThemeMode, "cream");
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(store.values.size, 0, "nothing is written");
  assert.equal(log.entries.length, 1, "nothing more is logged");
  assert.deepEqual(warnings, [NOT_SAVED], "nothing more is shown");
  mock.restoreAll();
});
