import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createFrontmatterFieldPatch,
  createFrontmatterFieldRemovePatch,
  extractFrontmatter,
} from "../../../src/core/frontmatter/okfFrontmatter";

function applyFieldPatch(source: string, patch: { start: number; end: number; text: string }): string {
  return source.slice(0, patch.start) + patch.text + source.slice(patch.end);
}

// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-043#S1
test("value patch rewrites only the edited field line and keeps its inline comment", () => {
  const source = "---\ntype: finding\ntitle: Alpha  # trailing comment\nstatus: draft\n---\n\nBody.\n";
  const patch = createFrontmatterFieldPatch(source, "title", "Beta");
  assert.ok(patch);
  assert.equal(source.slice(patch.start, patch.end), "title: Alpha  # trailing comment");
  assert.equal(
    applyFieldPatch(source, patch),
    "---\ntype: finding\ntitle: Beta  # trailing comment\nstatus: draft\n---\n\nBody.\n",
  );
});

// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-043#S5
test("value patch for an anchored value still writes correct data", () => {
  const source = "---\na: &x 1\nb: 3\n---\n";
  const patch = createFrontmatterFieldPatch(source, "a", 2);
  assert.ok(patch);
  const updated = applyFieldPatch(source, patch);
  assert.deepEqual(extractFrontmatter(updated).frontmatter, { a: 2, b: 3 });
});

// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-043#S1
// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-043#S5
test("value patch for a nested map written as an object yields the same data", () => {
  const source = [
    "---",
    "metadata:",
    "  owner: old",
    "  enabled: true",
    "other: keep",
    "---",
    "",
  ].join("\n");
  const patch = createFrontmatterFieldPatch(source, "metadata", { owner: "new", enabled: false });
  assert.ok(patch);
  const updated = applyFieldPatch(source, patch);
  assert.deepEqual(extractFrontmatter(updated).frontmatter, {
    metadata: { owner: "new", enabled: false },
    other: "keep",
  });
});

// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-043#S2
// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-043#S3
test("appending a sequence item keeps a comment line between existing items", () => {
  const source = "---\ntags:\n  - one\n  # note\n  - two\nstatus: draft\n---\n";
  const patch = createFrontmatterFieldPatch(source, "tags", ["one", "two", "three"]);
  assert.ok(patch);
  const updated = applyFieldPatch(source, patch);
  assert.match(updated, /  # note\n/u);
  assert.deepEqual(extractFrontmatter(updated).frontmatter?.tags, ["one", "two", "three"]);
  assert.equal(extractFrontmatter(updated).frontmatter?.status, "draft");
});

// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-043#S1
// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-043#S2
test("value patch with an unchanged value leaves the document text identical", () => {
  const source = "---\ntype: finding\n# keep\ntitle: Alpha  # note\ntags:\n  - one\n  - two\n---\nBody\n";
  const patch = createFrontmatterFieldPatch(source, "title", "Alpha");
  assert.ok(patch);
  assert.equal(applyFieldPatch(source, patch), source);
  const listPatch = createFrontmatterFieldPatch(source, "tags", ["one", "two"]);
  assert.ok(listPatch);
  assert.equal(applyFieldPatch(source, listPatch), source);
});

// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-043#S2
test("value patch fills an empty value on CRLF documents without touching the next line", () => {
  const source = "---\r\nexemption_reason:\r\nderived_by: []\r\n---\r\n\r\nBody\r\n";
  const patch = createFrontmatterFieldPatch(source, "exemption_reason", "n/a");
  assert.ok(patch);
  assert.equal(
    applyFieldPatch(source, patch),
    "---\r\nexemption_reason: n/a\r\nderived_by: []\r\n---\r\n\r\nBody\r\n",
  );
});

test("appending to a sequence keeps a trailing commented-out item once", () => {
  const source = "---\nderives_from:\n  - StRS-CORE-001\n  # - StRS-CORE-002\nstatus: draft\n---\n";
  const patch = createFrontmatterFieldPatch(source, "derives_from", ["StRS-CORE-001", "StRS-CORE-003"]);
  assert.ok(patch);
  assert.equal(
    applyFieldPatch(source, patch),
    "---\nderives_from:\n  - StRS-CORE-001\n  - StRS-CORE-003\n  # - StRS-CORE-002\nstatus: draft\n---\n",
  );
  const unchanged = createFrontmatterFieldPatch(source, "derives_from", ["StRS-CORE-001"]);
  assert.ok(unchanged);
  assert.equal(applyFieldPatch(source, unchanged), source);
});

test("a commented last item of a block sequence keeps its comment once", () => {
  const source = "---\ntags:\n  - one\n  - two  # keep\nstatus: draft\n---\n";
  const patch = createFrontmatterFieldPatch(source, "tags", ["one", "two", "three"]);
  assert.ok(patch);
  const updated = applyFieldPatch(source, patch);
  assert.equal(updated.match(/# keep/gu)?.length, 1);
  assert.deepEqual(extractFrontmatter(updated).frontmatter?.tags, ["one", "two", "three"]);
});

test("editing a nested map keeps its trailing comment once", () => {
  const source = "---\nmeta:\n  owner: old\n  # trailing in meta\nother: keep\n---\n";
  const patch = createFrontmatterFieldPatch(source, "meta", { owner: "new" });
  assert.ok(patch);
  assert.equal(
    applyFieldPatch(source, patch),
    "---\nmeta:\n  owner: new\n  # trailing in meta\nother: keep\n---\n",
  );
});

test("editing a block scalar keeps its header comment", () => {
  const source = "---\nsummary: >- # header\n  Folded text\n  spans.\nstatus: draft\n---\n";
  const patch = createFrontmatterFieldPatch(source, "summary", "New");
  assert.ok(patch);
  assert.equal(
    applyFieldPatch(source, patch),
    "---\nsummary: >- # header\n  New\nstatus: draft\n---\n",
  );
});

test("replacing a commented scalar by a list keeps the comment once", () => {
  const source = "---\ntags: one  # c\nstatus: draft\n---\n";
  const patch = createFrontmatterFieldPatch(source, "tags", ["one", "two"]);
  assert.ok(patch);
  const updated = applyFieldPatch(source, patch);
  assert.equal(updated.match(/# c/gu)?.length, 1);
  assert.deepEqual(extractFrontmatter(updated).frontmatter, { tags: ["one", "two"], status: "draft" });
});

// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-004#S5
test("a multi-line value on a plain field is written as a literal block", () => {
  const source = "---\ndescription: When export is requested\n  output.\nb: 2\n---\n";
  const patch = createFrontmatterFieldPatch(source, "description", "a\nb");
  assert.ok(patch);
  assert.equal(applyFieldPatch(source, patch), "---\ndescription: |-\n  a\n  b\nb: 2\n---\n");
});

test("a multi-line comment between CRLF sequence items keeps CRLF line endings", () => {
  const source = "---\r\ntags:\r\n  - one\r\n  # note line 1\r\n  # note line 2\r\n  - two\r\nstatus: draft\r\n---\r\n";
  const patch = createFrontmatterFieldPatch(source, "tags", ["one", "two", "three"]);
  assert.ok(patch);
  assert.doesNotMatch(patch.text, /\r(?!\n)/u);
  assert.equal(
    applyFieldPatch(source, patch),
    "---\r\ntags:\r\n  - one\r\n  # note line 1\r\n  # note line 2\r\n  - two\r\n  - three\r\nstatus: draft\r\n---\r\n",
  );
});

test("a multi-line comment inside a CRLF nested map keeps CRLF line endings", () => {
  const source = "---\r\nmeta:\r\n  k: v\r\n  # a\r\n  # b\r\n  z: 1\r\nother: x\r\n---\r\n";
  const patch = createFrontmatterFieldPatch(source, "meta", { k: "w", z: 1 });
  assert.ok(patch);
  assert.doesNotMatch(patch.text, /\r(?!\n)/u);
  assert.equal(
    applyFieldPatch(source, patch),
    "---\r\nmeta:\r\n  k: w\r\n  # a\r\n  # b\r\n  z: 1\r\nother: x\r\n---\r\n",
  );
});

// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-029#S2
test("frontmatter field removal keeps the comment lines above the removed key", () => {
  const source = "---\ntype: x\n# about legacy\nlegacy: 1\n# about status\nstatus: draft\n---\n";
  const patch = createFrontmatterFieldRemovePatch(source, "legacy");
  assert.ok(patch);
  assert.equal(
    source.slice(0, patch.start) + patch.text + source.slice(patch.end),
    "---\ntype: x\n# about legacy\n# about status\nstatus: draft\n---\n",
  );
});
