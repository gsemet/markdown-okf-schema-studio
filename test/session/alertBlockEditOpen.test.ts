/**
 * The block editor opened on a paragraph of a GitHub alert gets the lines of that paragraph. The
 * layout fixture is rendered, the lines the page would send for the paragraph of the second alert
 * are read from the rendered HTML, and the open goes through `handlePageMessage` of the real
 * `PreviewManager` over an in-memory document, like a page message.
 */

import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { test } from "node:test";

import type { HostServices } from "../../src/host-api/index";
import type { PanelGroups } from "../../src/host-api/previewPanel";
import { createMemoryDocumentStore } from "../../src/host-memory/memoryDocumentStore";
import { renderMyst } from "../../src/core/render/mystRenderer";
import { PreviewManager } from "../../src/session/previewManager";
import { PreviewSession } from "../../src/session/previewSession";
import { attribute, findElement, hasClass, parseHtml } from "../core/render/dom";
import { nodeHostPorts } from "./nodeHostPorts";

const LAYOUT_FIXTURE = path.resolve(__dirname, "../../../test/core/render/alert-fixtures/layout-two-alerts.md");

async function settle(): Promise<void> {
  for (let index = 0; index < 20; index += 1) {
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
}

/** A writable preview over an in-memory document; returns what the host posts to the page. */
function openPreview(text: string) {
  const store = createMemoryDocumentStore();
  const document = store.add("file:///w/README.md", text, "/w/README.md");
  const host = { ...nodeHostPorts, files: {}, documents: store, ui: {} } as unknown as HostServices;
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
    readOnly: false,
    webview: {},
    states: {},
    state: undefined,
    status: "success",
    configuration: {},
    plantUmlConfiguration: {},
    plantUmlEngineSettings: {},
    frontmatterConfiguration: {},
  } as never);
  preview.stage = { activeDocumentIdentity: document.id, activeDocumentRevision: document.revision, requestId: 1 } as never;
  preview.page.readyRequestId = 1;
  (manager as unknown as { live: Set<PreviewSession> }).live.add(preview);
  manager.rendering.refreshPreviewDocument = () => Promise.resolve() as never;
  const send = async (type: string, extra: Record<string, unknown>): Promise<void> => {
    await manager.handlePageMessage(preview, {
      type, documentId: document.id, revision: document.revision, requestId: 1, ...extra,
    });
    await settle();
  };
  return { posted, send };
}

// @tests_req SwRS-MDOKFSTUDIO-GFM-009
test("a click on the paragraph of the second alert of a document opens the editor on that paragraph", async () => {
  const source = fs.readFileSync(LAYOUT_FIXTURE, "utf8");
  const lines = source.split("\n");
  // The second alert of the fixture: the marker on line 39, its paragraph on lines 40 and 41.
  assert.equal(lines[38], "> [!NOTE]");
  const html = (await renderMyst(source)).html;
  const note = findElement(parseHtml(html), (element) => element.tagName === "aside" && hasClass(element, "note"));
  assert.ok(note, "the second alert renders as a note");
  const paragraph = findElement(note, (element) => element.tagName === "p" && attribute(element, "data-line") !== undefined);
  assert.ok(paragraph, "the paragraph of the note is a mapped block");
  const line = Number(attribute(paragraph, "data-line"));
  const endLine = Number(attribute(paragraph, "data-end-line"));

  const preview = openPreview(source);
  await preview.send("previewEditOpen", { editId: "e1", line, endLine });
  const answer = preview.posted.find((message) => message.type === "previewEditSource");
  assert.equal(answer?.error, undefined);
  assert.equal(answer?.originalText, `${lines.slice(39, 41).join("\n")}\n`);
  assert.match(String(answer?.originalText), /^> Neque porro quisquam est[^\n]*\n> adipisci velit[^\n]*\n$/u);
});
