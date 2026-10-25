/**
 * Requirement tests of the PlantUML controller and its host gates: the include request gate, the
 * answer of an include request, the clearing of the include watch on a document switch, and the
 * application of the host's diagrams. The controller runs against recording fakes of the manager.
 */
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import type { PageToHostMessage } from "../../src/core/protocol/pageToHost";
import { PlantUmlIncludeWatch } from "../../src/core/render/plantUmlIncludes";
import { PageMessageDispatcher } from "../../src/session/pageMessages";
import { PlantUmlController } from "../../src/session/features/plantUml";
import { HostRequestController } from "../../src/session/features/hostRequests";
import { RenderingController } from "../../src/session/features/rendering";
import { PreviewManager } from "../../src/session/previewManager";
import type { PreviewSession } from "../../src/session/previewSession";

const DOCUMENT = "file:///notes/doc.md";

// @tests_req SwRS-MDOKFSTUDIO-TRUST-065
test("an include request is handled for the current document even one render behind, and dropped otherwise", () => {
  const handled: string[] = [];
  const session = {
    disposed: false,
    readOnly: false,
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
  };
  const router = {
    dispatch: (message: PageToHostMessage) => {
      handled.push(message.type);
      return { handled: true, result: undefined };
    },
  };
  const dispatcher = new PageMessageDispatcher(manager as unknown as PreviewManager, router as never);
  const include = (documentId: string, revision: number, requestId: number): Record<string, unknown> => ({
    type: "previewPlantUmlInclude", documentId, revision, requestId, path: "a.puml", from: null, editId: "e1",
  });

  dispatcher.handle(session, include(DOCUMENT, 2, 3));
  assert.deepEqual(handled, ["previewPlantUmlInclude"], "a page behind by several renders is still answered");

  assert.equal(dispatcher.handle(session, include("file:///other.md", 4, 9)), undefined);
  assert.deepEqual(handled, ["previewPlantUmlInclude"]);

  (session as unknown as { disposed: boolean }).disposed = true;
  assert.equal(dispatcher.handle(session, include(DOCUMENT, 4, 9)), undefined);
  assert.deepEqual(handled, ["previewPlantUmlInclude"]);
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-090
test("an include request is answered once with the request's edit id: the file, or a refusal", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "diag-req-include-"));
  try {
    const documentPath = path.join(root, "doc.md");
    fs.writeFileSync(path.join(root, "part.puml"), "@startuml\nA -> B\n@enduml\n");
    const posted: Array<Record<string, unknown>> = [];
    const preview = {
      workspaceRoot: root,
      plantUml: { includeWatch: new PlantUmlIncludeWatch() },
      postToPage: (message: Record<string, unknown>) => {
        posted.push(message);
        return Promise.resolve(true);
      },
    } as unknown as PreviewSession;
    const requests = Object.create(HostRequestController.prototype) as HostRequestController;
    const manager = {
      host: { workspace: { trusted: true } },
      activePathOf: () => documentPath,
      canonicalPath: (value: string) => value,
      requests,
    };
    let handler: ((message: unknown, preview: PreviewSession) => void) | undefined;
    new PlantUmlController(manager as never).register({
      on: (type: string, callback: typeof handler) => {
        assert.equal(type, "previewPlantUmlInclude");
        handler = callback;
      },
    } as never);
    const request = (name: string, editId: string): Record<string, unknown> => ({
      type: "previewPlantUmlInclude", documentId: DOCUMENT, revision: 4, requestId: 9, path: name, from: null, editId,
    });

    handler!(request("part.puml", "edit-1"), preview);
    assert.equal(posted.length, 1);
    assert.equal(posted[0]!.type, "previewPlantUmlIncludeResult");
    assert.equal(posted[0]!.editId, "edit-1");
    assert.equal(posted[0]!.ok, true);
    assert.equal(posted[0]!.id, path.join(fs.realpathSync(root), "part.puml"));
    assert.equal(posted[0]!.text, "@startuml\nA -> B\n@enduml\n");

    handler!(request("../../etc/passwd", "edit-2"), preview);
    assert.equal(posted.length, 2);
    assert.equal(posted[1]!.editId, "edit-2");
    assert.equal(posted[1]!.ok, false);
    assert.equal(typeof posted[1]!.reason, "string");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-053
test("the include watch is emptied when the preview follows another document", () => {
  const includeWatch = new PlantUmlIncludeWatch();
  includeWatch.remember("/notes/included.puml");
  const session = {
    documentUri: "file:///notes/one.md",
    readOnly: false,
    workspaceRoot: "/notes",
    plantUml: { includeWatch },
    edits: { lock: { forgetPage: () => undefined }, watchedPageEditorId: "x" },
    queue: { cancel: () => undefined, clearLastGood: () => undefined },
    states: new Map(),
    state: undefined,
    panel: { title: "" },
  } as unknown as PreviewSession;
  const manager = {
    host: { workspace: { folderOf: () => ({ path: "/notes" }), trusted: true } },
    pathOf: () => "/notes/two.md",
    diagnostics: { clear: () => undefined },
    previewTitle: () => "Preview two",
    rendering: { showPending: () => undefined, refreshPreviewDocument: () => Promise.resolve() },
  };
  const switchDocument = (PreviewManager.prototype as unknown as {
    switchDocument(session: PreviewSession, document: unknown): void;
  }).switchDocument;

  switchDocument.call(manager, session, { id: "file:///notes/two.md", path: "/notes/two.md" });

  assert.equal(session.documentUri, "file:///notes/two.md");
  assert.equal(includeWatch.size, 0);
  assert.equal(includeWatch.has("/notes/included.puml"), false);
});

function applyFixture(current: boolean): {
  controller: PlantUmlController;
  preview: PreviewSession;
  result: unknown;
  set: Array<{ html: string; diagnostics: Array<Record<string, unknown>> }>;
} {
  const set: Array<{ html: string; diagnostics: Array<Record<string, unknown>> }> = [];
  const stage = { activeDocumentIdentity: DOCUMENT, activeDocumentPath: "/notes/doc.md", requestId: 9 };
  const result = { stage, diagnostics: [] };
  const preview = {
    disposed: false,
    documentUri: DOCUMENT,
    stage: current ? stage : { ...stage },
    status: "success",
    shownStatus: undefined,
    page: { enrichmentGeneration: 1, readyRequestId: 0 },
    configuration: { incrementalUpdates: false },
    webview: {
      html: '<html><body><figure class="myst-plantuml-figure"><div class="myst-plantuml-diagram">A</div></figure></body></html>',
      diagnostics: [],
    },
  } as unknown as PreviewSession;
  const real = new RenderingController({ has: () => true } as never);
  const manager = {
    rendering: {
      isCurrentRender: real.isCurrentRender.bind(real),
      setPanelHtml: (_preview: unknown, html: string, diagnostics: Array<Record<string, unknown>>) => set.push({ html, diagnostics }),
    },
  };
  return { controller: new PlantUmlController(manager as never), preview, result, set };
}

const applyOf = (controller: PlantUmlController): (
  preview: PreviewSession, result: unknown, generation: number, plantUml: unknown,
) => void => (controller as unknown as { apply: never }).apply;

// @tests_req SwRS-MDOKFSTUDIO-DIAG-089
test("each failing JAR diagram is also a plantuml-render warning with the document path", () => {
  const { controller, preview, result, set } = applyFixture(true);
  const plantUml = {
    diagrams: [{ status: "error", message: "boom", line: 3 }],
    diagnostics: [
      { message: "boom", severity: "warning", line: 3 },
      { message: "no java", severity: "warning", line: 8 },
    ],
  };

  applyOf(controller).call(controller, preview, result, 1, plantUml);

  assert.equal(set.length, 1);
  assert.deepEqual(set[0]!.diagnostics.map((item) => [item.code, item.file, item.line]), [
    ["plantuml-render", "/notes/doc.md", 3],
    ["plantuml-render", "/notes/doc.md", 8],
  ]);
  assert.match(set[0]!.html, /data-sphinx-preview-diagnostic-code="plantuml-render"/u);

  const ok = applyFixture(true);
  applyOf(ok.controller).call(ok.controller, ok.preview, ok.result, 1, {
    diagrams: [{ status: "rendered", svg: "<svg></svg>" }],
    diagnostics: [],
  });
  assert.equal(ok.set.length, 1);
  assert.deepEqual(ok.set[0]!.diagnostics, []);
  assert.doesNotMatch(ok.set[0]!.html, /plantuml-render/u);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-105
test("JAR results of a render that is no longer the current one are dropped", () => {
  const plantUml = { diagrams: [{ status: "rendered", svg: "<svg></svg>" }], diagnostics: [] };

  const stale = applyFixture(false);
  applyOf(stale.controller).call(stale.controller, stale.preview, stale.result, 1, plantUml);
  assert.equal(stale.set.length, 0, "a superseded render takes nothing");

  const older = applyFixture(true);
  applyOf(older.controller).call(older.controller, older.preview, older.result, 0, plantUml);
  assert.equal(older.set.length, 0, "a superseded generation takes nothing");

  const current = applyFixture(true);
  applyOf(current.controller).call(current.controller, current.preview, current.result, 1, plantUml);
  assert.equal(current.set.length, 1);
  assert.match(current.set[0]!.html, /myst-plantuml-image/u);
});
