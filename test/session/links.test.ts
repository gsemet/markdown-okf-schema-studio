/**
 * The links controller (`src/session/features/links.ts`): a frontmatter link reads the marker
 * identity from the same text snapshot as the link analysis, even when the document changes while
 * the target is validated.
 */

import * as assert from "node:assert/strict";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import { nodeSchemaFiles } from "../../src/node-services/schemaFiles";
import { LinkController } from "../../src/session/features/links";
import type { PreviewManager } from "../../src/session/previewManager";
import type { PreviewSession } from "../../src/session/previewSession";

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-073
// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-102
test("a frontmatter link finds its marker with the identity of the text it was analysed from", async () => {
  const root = path.join(os.tmpdir(), "okf-links-snapshot");
  const documentPath = path.join(root, "doc.md");
  const targetPath = path.join(root, "target.md");
  let text = "---\nid: alpha\nsee: target.md\n---\n# Doc\n";
  const document = {
    id: "file:///doc.md",
    path: documentPath,
    revision: 3,
    eol: "\n" as const,
    isDirty: false,
    lineCount: 5,
    getText: () => text,
    lineText: (index: number) => text.split("\n")[index] ?? "",
  };
  const link = {
    fieldPath: "see",
    status: "valid",
    resolvedPath: targetPath,
    normalizedTarget: "target.md",
    resolution: "document-relative",
    basenameMarker: "@ref",
    idMarker: "id",
  };
  const analysedTexts: string[] = [];
  let validations = 0;
  const manager = {
    host: {
      documents: { open: () => Promise.resolve(document), idOf: (filePath: string) => `file://${filePath}` },
      files: { readFile: () => Promise.resolve(Buffer.from("# Target\n@ref alpha\n@ref beta\n")) },
      schemaFiles: nodeSchemaFiles,
    },
    navigator: {
      validateResolvedPreviewNavigation: async (candidate: string, suffix: string) => {
        validations += 1;
        // The document changes while the target is validated.
        text = "---\nid: beta\nsee: target.md\n---\n# Doc\n";
        return { kind: "local" as const, path: candidate, suffix };
      },
    },
    pathOf: (candidate: { path: string }) => candidate.path,
    frontmatter: {
      analyze: (_preview: unknown, _filePath: string, source: string) => {
        analysedTexts.push(source);
        return { fields: [], linkResults: [link] };
      },
      setState: () => undefined,
    },
  } as unknown as PreviewManager;
  const preview = {
    stage: { activeDocumentPath: documentPath, activeDocumentIdentity: document.id, requestId: 1 },
    document,
    documentUri: document.id,
    workspaceRoot: root,
    sessionRoots: [root],
    navigationRoots: [root],
    readOnly: false,
    frontmatter: {},
    frontmatterConfiguration: { allowOutsideWorkspaceLinks: false },
  } as unknown as PreviewSession;

  const request = `okf-link:${encodeURIComponent(JSON.stringify({ fieldPath: "see" }))}`;
  const navigation = await new LinkController(manager).resolve(preview, request);

  assert.equal(validations, 1);
  assert.deepEqual(analysedTexts, ["---\nid: alpha\nsee: target.md\n---\n# Doc\n"]);
  assert.deepEqual(navigation, { kind: "local", path: targetPath, suffix: "", markerLine: 2 });
});
