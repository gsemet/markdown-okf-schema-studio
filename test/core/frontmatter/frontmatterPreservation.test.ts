import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
  createFrontmatterFieldPatch,
  createFrontmatterFieldRemovePatch,
  createFrontmatterFieldRenamePatch,
  extractFrontmatter,
} from "../../../src/core/frontmatter/okfFrontmatter";

// Formatting-preservation corpus for frontmatter edits (QA-01). A value edit or a structural edit
// must change only the lines it names. Every other byte of the document stays identical.
// Value edits (T05) and structural edits (T06) are checked against the full resulting text.

type FixtureName = "F1" | "F2" | "F3" | "F4";

function lines(...rows: string[]): string {
  return rows.join("\n") + "\n";
}

// F1: real OKF requirement with compact sequences and a plain multi-line scalar.
const F1 = lines(
  "---",
  "type: SwRS",
  "id: SwRS-CORE-001",
  "uuid: 00000000-0000-4000-8000-000000000002",
  "title: Write CSV output",
  "description: When export is requested, the service SHALL write the report as CSV",
  "  output.",
  "project: OKFREQXMP",
  "scope: Core",
  "lifecycle: draft",
  "origin: native",
  "tier: SwRS",
  "derives_from:",
  "- StRS-CORE-001",
  "annotation_exemption: false",
  "exemption_reason:",
  "derived_by: []",
  "implemented_in_files:",
  "- src/export.py",
  "tested_in_files:",
  "- tests/test_export.py",
  "---",
  "",
  "## EARS Expression",
);

// F2: indented sequences, comments, folded and quoted scalars, flow sequence, blank line.
function f2(closing: string): string {
  return lines(
    "---",
    "# leading comment",
    "title: Alpha  # trailing comment",
    "tags:",
    "  - one",
    "  - two",
    "summary: >-",
    "  Folded text that",
    "  spans lines.",
    "links: [a.md, b.md]",
    'quoted: "keep: me"',
    "",
    "status: draft",
    closing,
    "Body",
  );
}
const F2 = f2("---");

// F3: F1 with CRLF line endings everywhere.
const F3 = F1.replace(/\n/gu, "\r\n");

// F4: F2 closed with `...` instead of the second `---`.
const F4 = f2("...");

const fixtures: Record<FixtureName, string> = { F1, F2, F3, F4 };

/** Adapts an LF block to the fixture's line endings. */
function adapt(fixture: FixtureName, block: string): string {
  return fixture === "F3" ? block.replace(/\n/gu, "\r\n") : block;
}

/** Replaces one block that must occur exactly once in the source. */
function replaceBlock(source: string, oldBlock: string, newBlock: string): string {
  assert.equal(source.split(oldBlock).length, 2, `fixture must contain this block once`);
  return source.split(oldBlock).join(newBlock);
}

function applyPatch(source: string, patch: { start: number; end: number; text: string }): string {
  return source.slice(0, patch.start) + patch.text + source.slice(patch.end);
}

// ---- Value edits (contract for T05) ----

interface ValueEdit {
  fixture: FixtureName;
  field: string;
  value: unknown;
  oldBlock: string;
  newBlock: string;
}

const valueEdits: ValueEdit[] = [
  {
    fixture: "F1",
    field: "title",
    value: "Write CSV output v2",
    oldBlock: "title: Write CSV output\n",
    newBlock: "title: Write CSV output v2\n",
  },
  {
    fixture: "F1",
    field: "lifecycle",
    value: "approved",
    oldBlock: "lifecycle: draft\n",
    newBlock: "lifecycle: approved\n",
  },
  {
    fixture: "F1",
    field: "annotation_exemption",
    value: true,
    oldBlock: "annotation_exemption: false\n",
    newBlock: "annotation_exemption: true\n",
  },
  {
    fixture: "F1",
    field: "exemption_reason",
    value: "n/a",
    oldBlock: "exemption_reason:\n",
    newBlock: "exemption_reason: n/a\n",
  },
  {
    fixture: "F1",
    field: "derives_from",
    value: ["StRS-CORE-001", "StRS-CORE-002"],
    oldBlock: "derives_from:\n- StRS-CORE-001\n",
    newBlock: "derives_from:\n- StRS-CORE-001\n- StRS-CORE-002\n",
  },
  {
    fixture: "F1",
    field: "derived_by",
    value: ["X-1"],
    oldBlock: "derived_by: []\n",
    newBlock: "derived_by: [X-1]\n",
  },
  {
    fixture: "F2",
    field: "title",
    value: "Beta",
    oldBlock: "title: Alpha  # trailing comment\n",
    newBlock: "title: Beta  # trailing comment\n",
  },
  {
    fixture: "F2",
    field: "tags",
    value: ["one", "two", "three"],
    oldBlock: "tags:\n  - one\n  - two\n",
    newBlock: "tags:\n  - one\n  - two\n  - three\n",
  },
  {
    fixture: "F2",
    field: "links",
    value: ["a.md", "c.md"],
    oldBlock: "links: [a.md, b.md]\n",
    newBlock: "links: [a.md, c.md]\n",
  },
  {
    fixture: "F2",
    field: "quoted",
    value: "still: quoted",
    oldBlock: 'quoted: "keep: me"\n',
    newBlock: 'quoted: "still: quoted"\n',
  },
  {
    fixture: "F2",
    field: "summary",
    value: "New summary",
    oldBlock: "summary: >-\n  Folded text that\n  spans lines.\n",
    newBlock: "summary: >-\n  New summary\n",
  },
  {
    fixture: "F2",
    field: "status",
    value: "active",
    oldBlock: "status: draft\n",
    newBlock: "status: active\n",
  },
  {
    fixture: "F3",
    field: "title",
    value: "Write CSV output v2",
    oldBlock: "title: Write CSV output\n",
    newBlock: "title: Write CSV output v2\n",
  },
  {
    fixture: "F4",
    field: "status",
    value: "active",
    oldBlock: "status: draft\n",
    newBlock: "status: active\n",
  },
];

for (const edit of valueEdits) {
  const label = `value edit ${edit.fixture} ${edit.field}`;
  // @tests_req SwRS-MDOKFSTUDIO-FMEDIT-043
  test(`${label} changes only the named field`, () => {
    const source = fixtures[edit.fixture];
    const patch = createFrontmatterFieldPatch(source, edit.field, edit.value);
    assert.ok(patch, "patch must be produced");
    const expected = replaceBlock(
      source,
      adapt(edit.fixture, edit.oldBlock),
      adapt(edit.fixture, edit.newBlock),
    );
    assert.equal(applyPatch(source, patch), expected);
  });
}

// ---- Structural edits (contract for T06) ----

// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-024
test("structural F2 rename title to heading keeps the trailing comment", () => {
  const patch = createFrontmatterFieldRenamePatch(F2, "title", "heading");
  assert.ok(patch, "patch must be produced");
  assert.equal(
    applyPatch(F2, patch),
    replaceBlock(F2, "title: Alpha  # trailing comment\n", "heading: Alpha  # trailing comment\n"),
  );
});

test("structural F2 remove links deletes exactly that line", () => {
  const patch = createFrontmatterFieldRemovePatch(F2, "links");
  assert.ok(patch, "patch must be produced");
  assert.equal(applyPatch(F2, patch), replaceBlock(F2, "links: [a.md, b.md]\n", ""));
});

// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-029
test("structural F2 remove tags deletes exactly the sequence lines", () => {
  const patch = createFrontmatterFieldRemovePatch(F2, "tags");
  assert.ok(patch, "patch must be produced");
  assert.equal(applyPatch(F2, patch), replaceBlock(F2, "tags:\n  - one\n  - two\n", ""));
});

test("structural F1 add owner appends one line before the closing delimiter", () => {
  const patch = createFrontmatterFieldPatch(F1, "owner", "Ana");
  assert.ok(patch, "patch must be produced");
  assert.equal(
    applyPatch(F1, patch),
    replaceBlock(F1, "- tests/test_export.py\n---\n", "- tests/test_export.py\nowner: Ana\n---\n"),
  );
});

test("structural F2 edits keep both comments unless their own line is removed", () => {
  const outputs = [
    applyPatch(F2, createFrontmatterFieldRenamePatch(F2, "title", "heading")!),
    applyPatch(F2, createFrontmatterFieldRemovePatch(F2, "links")!),
    applyPatch(F2, createFrontmatterFieldRemovePatch(F2, "tags")!),
    applyPatch(F2, createFrontmatterFieldPatch(F2, "title", "Beta")!),
    applyPatch(F2, createFrontmatterFieldPatch(F2, "status", "active")!),
    applyPatch(F2, createFrontmatterFieldPatch(F2, "tags", ["one", "two", "three"])!),
    applyPatch(F2, createFrontmatterFieldPatch(F2, "links", ["a.md", "c.md"])!),
    applyPatch(F2, createFrontmatterFieldPatch(F2, "quoted", "still: quoted")!),
    applyPatch(F2, createFrontmatterFieldPatch(F2, "summary", "New summary")!),
  ];
  // None of these operations removes the comment lines or the title line that carries one.
  for (const output of outputs) {
    assert.match(output, /^# leading comment\n/mu);
    assert.match(output, /# trailing comment\n/u);
  }
});

// ---- Structural edits: minimal patches (T06) ----

test("structural F2 add owner after title inserts one line directly after the title", () => {
  const patch = createFrontmatterFieldPatch(F2, "owner", "Ana", { afterField: "title" });
  assert.ok(patch, "patch must be produced");
  assert.equal(patch.positioned, true);
  assert.equal(
    applyPatch(F2, patch),
    replaceBlock(F2, "title: Alpha  # trailing comment\n", "title: Alpha  # trailing comment\nowner: Ana\n"),
  );
});

test("structural F2 add after the last field matches the add without afterField", () => {
  const withAfter = createFrontmatterFieldPatch(F2, "owner", "Ana", { afterField: "status" });
  const without = createFrontmatterFieldPatch(F2, "owner", "Ana");
  assert.ok(withAfter && without, "patches must be produced");
  assert.equal(withAfter.positioned, true);
  assert.equal(applyPatch(F2, withAfter), applyPatch(F2, without));
  assert.equal(
    applyPatch(F2, without),
    replaceBlock(F2, "status: draft\n---\n", "status: draft\nowner: Ana\n---\n"),
  );
});

test("structural add to an empty frontmatter block writes the pair into the fence", () => {
  const source = "---\n---\nBody\n";
  const patch = createFrontmatterFieldPatch(source, "owner", "Ana");
  assert.ok(patch, "patch must be produced");
  assert.equal(applyPatch(source, patch), "---\nowner: Ana\n---\nBody\n");
});

test("structural F1 add of a list uses the compact sequence style", () => {
  const patch = createFrontmatterFieldPatch(F1, "owner", ["a", "b"]);
  assert.ok(patch, "patch must be produced");
  assert.equal(
    applyPatch(F1, patch),
    replaceBlock(F1, "- tests/test_export.py\n---\n", "- tests/test_export.py\nowner:\n- a\n- b\n---\n"),
  );
});

test("structural F2 remove of the last field keeps the blank line and the closing fence", () => {
  const patch = createFrontmatterFieldRemovePatch(F2, "status");
  assert.ok(patch, "patch must be produced");
  assert.equal(
    applyPatch(F2, patch),
    lines(
      "---",
      "# leading comment",
      "title: Alpha  # trailing comment",
      "tags:",
      "  - one",
      "  - two",
      "summary: >-",
      "  Folded text that",
      "  spans lines.",
      "links: [a.md, b.md]",
      'quoted: "keep: me"',
      "",
      "---",
      "Body",
    ),
  );
});

test("structural F2 rename to a key that needs quoting changes only that line", () => {
  const patch = createFrontmatterFieldRenamePatch(F2, "tags", "a: b");
  assert.ok(patch, "patch must be produced");
  assert.equal(
    applyPatch(F2, patch),
    replaceBlock(F2, "tags:\n  - one\n  - two\n", '"a: b":\n  - one\n  - two\n'),
  );
});

test("structural CRLF add after a field keeps CRLF line endings", () => {
  const source = "---\r\ntitle: A  # c\r\nstatus: draft\r\n---\r\nBody\r\n";
  const patch = createFrontmatterFieldPatch(source, "owner", "Ana", { afterField: "title" });
  assert.ok(patch, "patch must be produced");
  assert.doesNotMatch(patch.text, /(?<!\r)\n/u);
  assert.equal(
    applyPatch(source, patch),
    "---\r\ntitle: A  # c\r\nowner: Ana\r\nstatus: draft\r\n---\r\nBody\r\n",
  );
});

test("structural CRLF add at the end appends one CRLF line before the fence", () => {
  const source = "---\r\ntitle: A\r\n---\r\nBody\r\n";
  const patch = createFrontmatterFieldPatch(source, "owner", "Ana");
  assert.ok(patch, "patch must be produced");
  assert.equal(applyPatch(source, patch), "---\r\ntitle: A\r\nowner: Ana\r\n---\r\nBody\r\n");
  // A compact sequence keeps its layout only on the minimal path; the fallback re-indents it.
  const compact = "---\r\ntags:\r\n- a\r\n---\r\nBody\r\n";
  const compactPatch = createFrontmatterFieldPatch(compact, "owner", "Ana");
  assert.ok(compactPatch, "patch must be produced");
  assert.equal(
    applyPatch(compact, compactPatch),
    "---\r\ntags:\r\n- a\r\nowner: Ana\r\n---\r\nBody\r\n",
  );
});

test("structural CRLF remove deletes the field lines and keeps CRLF", () => {
  const source = "---\r\ntitle: A\r\ntags:\r\n  - one\r\n  - two\r\nstatus: draft\r\n---\r\n";
  const patch = createFrontmatterFieldRemovePatch(source, "tags");
  assert.ok(patch, "patch must be produced");
  assert.equal(applyPatch(source, patch), "---\r\ntitle: A\r\nstatus: draft\r\n---\r\n");
});

test("structural CRLF remove of the last field drops the preceding break", () => {
  const source = "---\r\ntitle: A\r\nstatus: draft\r\n---\r\n";
  const patch = createFrontmatterFieldRemovePatch(source, "status");
  assert.ok(patch, "patch must be produced");
  assert.equal(applyPatch(source, patch), "---\r\ntitle: A\r\n---\r\n");
  // A compact sequence keeps its layout only on the minimal path; the fallback re-indents it.
  const compact = "---\r\ntags:\r\n- a\r\nstatus: draft\r\n---\r\n";
  const compactPatch = createFrontmatterFieldRemovePatch(compact, "status");
  assert.ok(compactPatch, "patch must be produced");
  assert.equal(applyPatch(compact, compactPatch), "---\r\ntags:\r\n- a\r\n---\r\n");
});

// ---- Structural edits: review round 1 (T06) ----

test("add after a list keeps its commented-out item above the new field", () => {
  const source = "---\ntags:\n  - a\n  # - b\nstatus: x\n---\n";
  const patch = createFrontmatterFieldPatch(source, "owner", "Ana", { afterField: "tags" });
  assert.ok(patch, "patch must be produced");
  assert.equal(patch.positioned, true);
  assert.equal(
    applyPatch(source, patch),
    "---\ntags:\n  - a\n  # - b\nowner: Ana\nstatus: x\n---\n",
  );
});

test("add after a list keeps its commented-out item above the new field on CRLF", () => {
  const source = "---\r\ntags:\r\n  - a\r\n  # - b\r\nstatus: x\r\n---\r\n";
  const patch = createFrontmatterFieldPatch(source, "owner", "Ana", { afterField: "tags" });
  assert.ok(patch, "patch must be produced");
  assert.equal(patch.positioned, true);
  assert.equal(
    applyPatch(source, patch),
    "---\r\ntags:\r\n  - a\r\n  # - b\r\nowner: Ana\r\nstatus: x\r\n---\r\n",
  );
});

test("add after a nested map keeps its trailing comment above the new field", () => {
  const source = "---\nmeta:\n  k: v\n  # trailing in meta\nstatus: x\n---\n";
  const patch = createFrontmatterFieldPatch(source, "owner", "Ana", { afterField: "meta" });
  assert.ok(patch, "patch must be produced");
  assert.equal(patch.positioned, true);
  assert.equal(
    applyPatch(source, patch),
    "---\nmeta:\n  k: v\n  # trailing in meta\nowner: Ana\nstatus: x\n---\n",
  );
});

test("add of a multi-line value after a commented list is still positioned", () => {
  const source = "---\ntags:\n  - a\n  # - b\nstatus: x\n---\n";
  const patch = createFrontmatterFieldPatch(source, "owner", "multi\nline", { afterField: "tags" });
  assert.ok(patch, "patch must be produced");
  assert.equal(patch.positioned, true);
  assert.equal(
    applyPatch(source, patch),
    "---\ntags:\n  - a\n  # - b\nowner: |-\n  multi\n  line\nstatus: x\n---\n",
  );
});

test("add after a list keeps a column-0 comment with the next field", () => {
  const source = "---\ntags:\n- a\n# about status\nstatus: x\n---\n";
  const patch = createFrontmatterFieldPatch(source, "owner", "Ana", { afterField: "tags" });
  assert.ok(patch, "patch must be produced");
  assert.equal(patch.positioned, true);
  assert.equal(
    applyPatch(source, patch),
    "---\ntags:\n- a\nowner: Ana\n# about status\nstatus: x\n---\n",
  );
});

test("removing the only field leaves a valid empty mapping", () => {
  const source = "---\ntitle: x\n---\nBody\n";
  const patch = createFrontmatterFieldRemovePatch(source, "title");
  assert.ok(patch, "patch must be produced");
  const updated = applyPatch(source, patch);
  assert.equal(updated, "---\n{}\n---\nBody\n");
  const parsed = extractFrontmatter(updated);
  assert.equal(parsed.error, undefined);
  assert.deepEqual(parsed.frontmatter, {});
});

test("removing the only field of a CRLF document leaves a valid empty mapping", () => {
  const source = "---\r\ntitle: x\r\n---\r\nBody\r\n";
  const patch = createFrontmatterFieldRemovePatch(source, "title");
  assert.ok(patch, "patch must be produced");
  const updated = applyPatch(source, patch);
  assert.equal(updated, "---\r\n{}\r\n---\r\nBody\r\n");
  const parsed = extractFrontmatter(updated);
  assert.equal(parsed.error, undefined);
  assert.deepEqual(parsed.frontmatter, {});
});
