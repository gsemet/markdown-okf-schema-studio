import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
  classifyPreviewReference,
  markdownFragmentLine,
  markdownFragmentRange,
  markdownMarkerLine,
} from "../../../src/core/navigation/previewNavigation";

test("Markdown fragments select headings and source lines, not fenced examples", () => {
  const source = "```md\n## My Heading\n```\n\n## My Heading\n\nOther Heading\n---\n## Café {#explicit-id}\nParagraph ^block-id\n## Range start\nRange end\n";
  assert.equal(markdownFragmentLine(source, "#my-heading"), 5);
  assert.equal(markdownFragmentLine(source, "#My%20Heading"), 5);
  assert.equal(markdownFragmentLine(source, "?view=1#other-heading"), 7);
  assert.equal(markdownFragmentLine(source, "#L4"), 4);
  assert.equal(markdownFragmentLine(source, "#L400"), undefined);
  assert.equal(markdownFragmentLine(source, "#missing"), undefined);
  assert.deepEqual(markdownFragmentRange(source, "#explicit-id"), { startLine: 9, endLine: 9 });
  assert.deepEqual(markdownFragmentRange(source, "#Caf%C3%A9"), { startLine: 9, endLine: 9 });
  assert.deepEqual(markdownFragmentRange(source, "#^block-id"), { startLine: 10, endLine: 10 });
  assert.deepEqual(markdownFragmentRange(source, "#L11-L12"), { startLine: 11, endLine: 12 });
});

test("marker navigation selects exact marker identities", () => {
  const source = [
    "# @implements_req SwRS-1-extra",
    "# @implements_req SwRS-1",
    "// @tests_req SwRS-1,",
  ].join("\n");

  assert.equal(markdownMarkerLine(source, "@implements_req", "SwRS-1"), 2);
  assert.equal(markdownMarkerLine(source, "@tests_req", "SwRS-1"), 3);
  assert.equal(markdownMarkerLine(source, "@implements_req", "SwRS-missing"), undefined);
  assert.equal(markdownMarkerLine(source, "", "SwRS-1"), undefined);
});

test("classifies relative links without touching the filesystem", () => {
  assert.deepEqual(classifyPreviewReference("references/PROPERTIES.md"), { kind: "relative", value: "references/PROPERTIES.md" });
  assert.equal(classifyPreviewReference("wiki:Note").kind, "wiki");
  for (const request of ["wiki:javascript:alert(1)", "wiki:%2Fetc/passwd", "%00.md", "%5Csecret", "//example.test"]) {
    assert.equal(classifyPreviewReference(request).kind, "blocked", request);
  }
});

test("a MyST (label)= line is the target of its fragment, but not inside a fence", () => {
  const source = "```md\n(shown)=\n```\n\n(intro)=\nA paragraph.\n\n(a.b:c_d-1)=\n- item\n";
  assert.deepEqual(markdownFragmentRange(source, "#intro"), { startLine: 5, endLine: 5 });
  assert.deepEqual(markdownFragmentRange(source, "#a.b:c_d-1"), { startLine: 8, endLine: 8 });
  assert.equal(markdownFragmentRange(source, "#shown"), undefined);
  assert.equal(markdownFragmentRange(source, "#missing"), undefined);
});
