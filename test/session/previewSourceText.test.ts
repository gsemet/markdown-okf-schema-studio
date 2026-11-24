/** The host gives the page the text of the render it shows, for the raw copy of a selection. */

import * as assert from "node:assert/strict";
import { test } from "node:test";

import { fixture } from "./blockFixture";

/** A fixture whose page-ready path runs without the editor and history services of a real host. */
function readyFixture(): ReturnType<typeof fixture> {
  const run = fixture();
  Object.assign(run.manager.host, { logger: { error: () => undefined, warn: () => undefined, info: () => undefined } });
  Object.assign(run.manager.scroll, { markEditorSelectionInPreview: () => undefined, postPageLiveState: () => undefined });
  return run;
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-271
test("a page ready for the current render gets the text of that render, addressed to it", async () => {
  const run = readyFixture();
  (run.preview.stage as unknown as { sourceText: string }).sourceText = "---\ntitle: A\n---\n\n# Title\r\n";
  await run.send("previewReady", { blockEditOpen: false });
  const [sent, ...others] = run.of("previewSourceText");
  assert.equal(others.length, 0);
  assert.equal(sent?.text, "---\ntitle: A\n---\n\n# Title\r\n", "the text as the document has it");
  assert.equal(sent?.documentId, run.document.id);
  assert.equal(sent?.requestId, 1);
  assert.equal(sent?.revision, run.preview.stage!.activeDocumentRevision);
  await run.send("previewReady", { blockEditOpen: false });
  assert.equal(run.of("previewSourceText").length, 2, "every ready posts it again (a patched page reports ready too)");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-271
test("a page ready for a render that is not the current one gets nothing", async () => {
  const run = readyFixture();
  (run.preview.stage as unknown as { sourceText: string }).sourceText = "# Title\n";
  await run.send("previewReady", { blockEditOpen: false, requestId: 0 });
  assert.deepEqual(run.of("previewSourceText"), []);
});
