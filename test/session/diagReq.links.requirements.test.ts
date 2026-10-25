/**
 * Requirement test of the frontmatter link request (`LinkController.resolve`): a malformed request
 * is refused with its own reason, a well-formed one is looked up.
 */
import * as assert from "node:assert/strict";
import { test } from "node:test";

import { LinkController } from "../../src/session/features/links";
import type { PreviewManager } from "../../src/session/previewManager";
import type { PreviewSession } from "../../src/session/previewSession";

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-113
test("a malformed frontmatter link request is refused with its own reason", async () => {
  const document = {
    id: "file:///notes/doc.md",
    path: "/notes/doc.md",
    revision: 3,
    getText: () => "---\nid: a\n---\n",
  };
  const manager = {
    host: { documents: { open: () => Promise.resolve(document), idOf: (value: string) => `file://${value}` }, schemaFiles: {} },
    navigator: {},
    pathOf: (value: { path: string }) => value.path,
    frontmatter: {
      analyze: () => ({ fields: [], linkResults: [] }),
      setState: () => undefined,
    },
  } as unknown as PreviewManager;
  const preview = {
    stage: { activeDocumentPath: "/notes/doc.md", activeDocumentIdentity: document.id, requestId: 1 },
    document,
    documentUri: document.id,
    workspaceRoot: "/notes",
    sessionRoots: ["/notes"],
    navigationRoots: ["/notes"],
    readOnly: false,
    frontmatter: {},
    frontmatterConfiguration: {},
  } as unknown as PreviewSession;
  const controller = new LinkController(manager);

  for (const request of ["okf-link:{not json", "okf-link:%E0%A4%A", "okf-link:"]) {
    assert.deepEqual(
      await controller.resolve(preview, request),
      { kind: "blocked", reason: "The frontmatter link request is invalid." },
      request,
    );
  }

  const unknown = `okf-link:${encodeURIComponent(JSON.stringify({ fieldPath: "see" }))}`;
  assert.deepEqual(
    await controller.resolve(preview, unknown),
    { kind: "blocked", reason: "The frontmatter link is unavailable." },
    "a well-formed request is looked up and refused for its own reason",
  );
});
