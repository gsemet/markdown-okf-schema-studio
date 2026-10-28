import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createRuntimeHarness, type RuntimeHarness } from "./runtimeHarness";
import { insertPointAfterLine } from "./runtimeTestSupport";

/** Files dragged from the Explorer onto the page: the drop marker and the message to the host (features/fileDrop.ts). */

const MARKER = "sphinx-preview-insert-point--drop";

function explorerDrag(files: string[], extra: Record<string, unknown> = {}) {
  const data = { "text/uri-list": files.join("\r\n") };
  const counts = { prevented: 0 };
  return {
    counts,
    event: {
      dataTransfer: { types: Object.keys(data), getData: (format: string) => (data as Record<string, string>)[format] ?? "" },
      clientY: 0,
      relatedTarget: {},
      preventDefault: () => { counts.prevented += 1; },
      ...extra,
    },
  };
}

function marked(harness: RuntimeHarness): Array<string | null> {
  return harness.createdElements
    .filter((element) => element.className.split(" ").includes(MARKER))
    .map((element) => element.getAttribute("data-sphinx-insert-after-line"));
}

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-004
test("files dragged over the page mark the nearest insertion bar and the drop posts their addresses", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const before = harness.messages.length;
  const second = insertPointAfterLine(harness, 52);
  const y = second.getBoundingClientRect().top + 3;
  const over = explorerDrag(["file:///w/a.md", "file:///w/b.png"], { clientY: y });
  harness.dispatchDocument("dragover", over.event);
  assert.equal(over.counts.prevented > 0, true, "the page accepts the drop");
  assert.deepEqual(marked(harness), ["52"]);
  const drop = explorerDrag(["file:///w/a.md", "file:///w/b.png"], { clientY: y });
  harness.dispatchDocument("drop", drop.event);
  assert.deepEqual(marked(harness), [], "the marker goes away on the drop");
  const sent = harness.messages.slice(before).filter((message) => message.type === "previewDropFiles");
  assert.equal(sent.length, 1);
  assert.equal(JSON.stringify([sent[0]!.insertAfterLine, sent[0]!.uris]), JSON.stringify([52, ["file:///w/a.md", "file:///w/b.png"]]));
  assert.equal(sent[0]!.documentId, "file:///active.md");
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-004
test("a drag without files, or outside edit mode is left to the browser", () => {
  const plain = createRuntimeHarness({ savedState: { editMode: true } });
  const text = { dataTransfer: { types: ["text/plain"], getData: () => "x" }, clientY: 0, preventDefault: () => { throw new Error("prevented"); } };
  plain.dispatchDocument("dragover", text);
  plain.dispatchDocument("drop", text);
  assert.deepEqual(marked(plain), []);

  const reading = createRuntimeHarness({ savedState: { editMode: false } });
  const read = explorerDrag(["file:///w/a.md"]);
  reading.dispatchDocument("dragover", read.event);
  reading.dispatchDocument("drop", read.event);
  assert.equal(read.counts.prevented, 0);
  assert.equal(reading.messages.some((message) => message.type === "previewDropFiles"), false);
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-004
test("leaving the window takes the marker away", () => {
  const harness = createRuntimeHarness({ savedState: { editMode: true } });
  const over = explorerDrag(["file:///w/a.md"], { clientY: 0 });
  harness.dispatchDocument("dragover", over.event);
  assert.equal(marked(harness).length, 1);
  harness.dispatchDocument("dragleave", { relatedTarget: null });
  assert.deepEqual(marked(harness), []);
});
