/**
 * Requirement tests of the editor reveal and pairing rules of the scroll sync controller
 * (`src/session/features/scrollSync.ts`), run on a preview manager over stub ports.
 */

import * as assert from "node:assert/strict";
import { test } from "node:test";
import * as path from "node:path";

import type { HostServices } from "../../src/host-api/index";
import type { PanelGroups } from "../../src/host-api/previewPanel";
import { EditorEchoGuard } from "../../src/core/scroll/anchorPolicy";
import { PreviewManager } from "../../src/session/previewManager";

const SOURCE = path.resolve("/workspace/active.md");
const DOCUMENT_ID = "file:///workspace/active.md";

interface StubEditor {
  fsPath: string;
  document: { id: string; lineCount: number };
  firstVisibleLine: number;
  revealLine(line: number, position: string): void;
}

function setup(options: { pairing?: boolean; lineCount?: number } = {}) {
  const revealed: Array<{ line: number; position: string }> = [];
  const editor: StubEditor = {
    fsPath: SOURCE,
    document: { id: DOCUMENT_ID, lineCount: options.lineCount ?? 50 },
    firstVisibleLine: 0,
    revealLine: (line, position) => revealed.push({ line, position }),
  };
  const host = {
    files: {},
    capabilities: { editorPairing: options.pairing ?? true },
    editors: { visible: () => [editor] },
  } as unknown as HostServices;
  const groups: PanelGroups = { lockNewPanelGroup: () => Promise.resolve(false), release: () => undefined };
  const manager = new PreviewManager(host, groups);
  const preview = {
    documentUri: DOCUMENT_ID,
    configuration: { scrollEditorWithPreview: true, scrollPreviewWithEditor: true },
    stage: { activeDocumentPath: SOURCE },
    scroll: { echoGuard: new EditorEchoGuard() },
  };
  const scroll = manager.scroll as unknown as {
    revealFromPage(session: unknown, message: Record<string, unknown>): void;
    visibleEditorFor(session: unknown): StubEditor | undefined;
  };
  return { scroll, preview, revealed, editor };
}

// @tests_req SwRS-MDOKFSTUDIO-LIFE-108
test("a revealed line is clamped between the first and the last line of the document", () => {
  const { scroll, preview, revealed } = setup({ lineCount: 50 });
  scroll.revealFromPage(preview, { type: "previewReveal", line: 400 });
  scroll.revealFromPage(preview, { type: "previewReveal", line: 0 });
  scroll.revealFromPage(preview, { type: "previewReveal", line: -7 });
  scroll.revealFromPage(preview, { type: "previewReveal", line: 12 });
  assert.deepEqual(revealed.map((entry) => entry.line), [49, 0, 0, 11]);
});

test("a reveal that names another source file moves nothing", () => {
  const { scroll, preview, revealed } = setup();
  scroll.revealFromPage(preview, { type: "previewReveal", line: 10, sourceFile: path.resolve("/workspace/other.md") });
  scroll.revealFromPage(preview, { type: "previewScroll", line: 10, sourceFile: path.resolve("/workspace/other.md") });
  assert.equal(revealed.length, 0, "a foreign file does not move the editor");
  scroll.revealFromPage(preview, { type: "previewReveal", line: 10, sourceFile: SOURCE });
  scroll.revealFromPage(preview, { type: "previewScroll", line: 20 });
  assert.deepEqual(revealed.map((entry) => entry.line), [9, 19], "the own file and a message without a file reveal");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-100
test("a host without text editors reports no pairing", () => {
  const none = setup({ pairing: false });
  assert.equal(none.scroll.visibleEditorFor(none.preview), undefined);
  const vscode = setup({ pairing: true });
  assert.equal(vscode.scroll.visibleEditorFor(vscode.preview), vscode.editor, "an editor that shows the document is paired");
  assert.equal(vscode.scroll.visibleEditorFor({ ...vscode.preview, documentUri: "file:///workspace/other.md" }), undefined);
});
