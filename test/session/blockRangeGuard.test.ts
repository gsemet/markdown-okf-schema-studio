/**
 * The host refuses a block edit whose range the document does not match (a range that starts on a
 * blank line, like the one a line shift of the preview once sent), with a clear answer and no write,
 * and it accepts every range the renderer gives to every kind of block. The real `PreviewManager`
 * runs over an in-memory document; every message goes through `handlePageMessage`.
 */

import * as assert from "node:assert/strict";
import { test } from "node:test";

import { planCut, spanText } from "../../src/core/mapping/blockRange";
import { renderMyst } from "../../src/core/render/mystRenderer";
import type { HostServices } from "../../src/host-api/index";
import type { PanelGroups } from "../../src/host-api/previewPanel";
import { createMemoryDocumentStore } from "../../src/host-memory/memoryDocumentStore";
import { PreviewManager } from "../../src/session/previewManager";
import { PreviewSession } from "../../src/session/previewSession";
import { attribute, findElements, parseHtml } from "../core/render/dom";
import { nodeHostPorts } from "./nodeHostPorts";

const DISAGREE = "The preview and the document disagree about this block's lines. Refresh the preview and try again.";

/** One document with every kind of block; each kind has blank lines inside where the syntax allows. */
const ALL_KINDS = [
  "---",
  "title: Kinds",
  "",
  "tags:",
  "  - a",
  "---",
  "",
  "# Heading",
  "",
  "Paragraph one",
  "continues here.",
  "",
  "- bullet a",
  "- bullet b",
  "",
  "- loose a",
  "",
  "- loose b",
  "",
  "1. ordered a",
  "2. ordered b",
  "",
  "- [ ] task a",
  "- [x] task b",
  "",
  "> quote line",
  ">",
  "> second quote paragraph",
  "",
  "> [!NOTE]",
  "> alert text",
  ">",
  "> second alert paragraph",
  "",
  "```python",
  "def f():",
  "",
  "    return 1",
  "```",
  "",
  "```mermaid",
  "graph TD",
  "  A --> B",
  "",
  "  B --> C",
  "```",
  "",
  "```plantuml",
  "@startuml",
  "Alice -> Bob",
  "",
  "Bob -> Alice",
  "@enduml",
  "```",
  "",
  ":::{note}",
  "Admonition text",
  "",
  "second paragraph",
  ":::",
  "",
  "::::{grid} 2",
  "",
  ":::{grid-item-card} One",
  "card text",
  "",
  "more card text",
  ":::",
  "",
  ":::{grid-item-card} Two",
  "card two",
  ":::",
  "",
  "::::",
  "",
  "```{list-table} Title",
  ":header-rows: 1",
  "",
  "* - H1",
  "  - H2",
  "* - a",
  "",
  "    b",
  "  - c",
  "```",
  "",
  "| a | b |",
  "|---|---|",
  "| 1 | 2 |",
  "",
  "$$",
  "x = 1",
  "",
  "y = 2",
  "$$",
  "",
  "<div>",
  "html block",
  "",
  "with blank",
  "</div>",
  "",
  "---",
  "",
  "[ref]: https://example.com",
  "",
  "Last line",
  "",
].join("\n");

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
  const of = (type: string) => posted.filter((message) => message.type === type);
  return { document, preview, of, send };
}

/** The exact text of lines `line`..`endLine` with the line break of the last line, like the host. */
function rangeText(text: string, line: number, endLine: number): string {
  const lines = text.match(/[^\r\n]*(?:\r\n|\n|\r|$)/gu)!.slice(0, -1);
  return lines.slice(line - 1, endLine).join("");
}

interface Range { line: number; endLine: number; tag: string }

/** Every mapped block of the rendered document, nested ones included, with its real range. */
async function renderedRanges(text: string): Promise<Range[]> {
  const root = parseHtml((await renderMyst(text)).html);
  return findElements(root, (element) => attribute(element, "data-line") !== undefined).map((element) => {
    const line = Number(attribute(element, "data-line"));
    return { line, endLine: Number(attribute(element, "data-end-line") ?? line), tag: element.tagName };
  });
}

async function checkAllAccepted(text: string, label: string, minimum = 20): Promise<number> {
  const ranges = await renderedRanges(text);
  assert.ok(ranges.length >= minimum, `${label}: the document renders many mapped blocks`);
  for (const range of ranges) {
    const preview = openPreview(text);
    await preview.send("previewEditOpen", { editId: "e", line: range.line, endLine: range.endLine });
    const answer = preview.of("previewEditSource")[0];
    const where = `${label}: <${range.tag}> lines ${range.line}-${range.endLine}`;
    assert.equal(answer?.error, undefined, where);
    assert.equal(answer?.originalText, rangeText(text, range.line, range.endLine), where);
  }
  return ranges.length;
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-256
test("an open on a range that starts on a blank line (the shifted heading) is refused and writes nothing", async () => {
  const text = "Intro\n\n### Edit MyST visually\n\nBody.\n";
  const preview = openPreview(text);
  await preview.send("previewEditOpen", { editId: "e1", line: 2, endLine: 3 });
  const answers = preview.of("previewEditSource");
  assert.equal(answers.length, 1);
  assert.equal(answers[0]!.error, DISAGREE);
  assert.equal(answers[0]!.originalText, undefined);
  assert.equal(preview.preview.edits.active, undefined);
  assert.equal(preview.document.getText(), text);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-256
test("an open on a range past the end of the document is refused", async () => {
  const text = "Intro\n\nBody.\n";
  const preview = openPreview(text);
  await preview.send("previewEditOpen", { editId: "e1", line: 3, endLine: 40 });
  const answers = preview.of("previewEditSource");
  assert.equal(answers.length, 1);
  assert.ok(typeof answers[0]!.error === "string" && answers[0]!.error !== "");
  assert.equal(answers[0]!.originalText, undefined);
  assert.equal(preview.document.getText(), text);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-256
test("a range that ends on a blank line keeps the lines of its block (a list ends on its separator)", async () => {
  const text = "- a\n\n- b\n\nAfter.\n";
  const preview = openPreview(text);
  await preview.send("previewEditOpen", { editId: "e1", line: 1, endLine: 4 });
  assert.equal(preview.of("previewEditSource")[0]!.originalText, "- a\n\n- b\n\n");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-256
test("Done and an autosave on a range that starts on a blank line are refused and the document is unchanged", async () => {
  const text = "Intro\n\n### Edit MyST visually\n\nBody.\n";
  for (const final of [true, false]) {
    const preview = openPreview(text);
    await preview.send("previewEditSave", {
      editId: "e1", line: 2, endLine: 3, originalText: "\n### Edit MyST visually\n", editedText: "\n### Changed\n", final,
    });
    const answers = preview.of("previewEditSource");
    assert.equal(answers.length, 1, `final ${final}`);
    assert.equal(answers[0]!.error, DISAGREE, `final ${final}`);
    assert.equal(preview.preview.edits.active, undefined, `final ${final}`);
    assert.equal(preview.document.getText(), text, `final ${final}`);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-256
test("a save on the right lines still writes", async () => {
  const text = "Intro\n\n### Edit MyST visually\n\nBody.\n";
  const preview = openPreview(text);
  await preview.send("previewEditSave", {
    editId: "e1", line: 3, endLine: 3, originalText: "### Edit MyST visually\n", editedText: "### Changed\n", final: false,
  });
  assert.deepEqual(preview.of("previewEditSource"), []);
  assert.match(preview.document.getText(), /### Changed/u);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-256
test("the host accepts every range the renderer gives to every kind of block", async () => {
  const count = await checkAllAccepted(ALL_KINDS, "LF");
  assert.ok(count > 40);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-256
test("the host accepts every renderer range of a CRLF document and of one without a final line break", async () => {
  await checkAllAccepted(ALL_KINDS.replace(/\n/gu, "\r\n"), "CRLF");
  await checkAllAccepted(ALL_KINDS.replace(/\n$/u, ""), "no final line break");
  await checkAllAccepted("# Only\n", "single line", 1);
  await checkAllAccepted("# Only", "single line without final break", 1);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-256
test("copy and cut still accept the renderer ranges of the kinds whose range ends on content", async () => {
  const ranges = (await renderedRanges(ALL_KINDS)).filter((range) =>
    ["h1", "p", "blockquote", "aside", "figure", "table", "hr", "code", "div"].includes(range.tag));
  assert.ok(ranges.length > 10);
  for (const range of ranges) {
    const where = `<${range.tag}> lines ${range.line}-${range.endLine}`;
    assert.equal(typeof spanText(ALL_KINDS, range.line, range.endLine), "string", `copy ${where}`);
    assert.ok("start" in planCut(ALL_KINDS, range.line, range.endLine), `cut ${where}`);
  }
});
