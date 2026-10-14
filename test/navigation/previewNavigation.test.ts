import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import {
  classifyPreviewReference,
  markdownFragmentLine,
  markdownFragmentRange,
  markdownMarkerLine,
  resolvePreviewNavigation,
  validateResolvedPreviewNavigation,
  validatePreviewNavigation,
} from "../../src/navigation/previewNavigation";

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

test("searches every workspace root and blocks cross-root wikilink ambiguity", async () => {
  const firstRoot = fs.mkdtempSync(path.join(os.tmpdir(), "studio-multi-root-a-"));
  const secondRoot = fs.mkdtempSync(path.join(os.tmpdir(), "studio-multi-root-b-"));
  try {
    const source = path.join(firstRoot, "active.md");
    fs.mkdirSync(path.join(firstRoot, "nested"));
    const firstNote = path.join(firstRoot, "nested", "Note.md");
    const secondNote = path.join(secondRoot, "Note.md");
    fs.writeFileSync(source, "# Active\n");
    fs.writeFileSync(firstNote, "# First\n");
    fs.writeFileSync(secondNote, "# Second\n");
    const roots = [firstRoot, secondRoot];
    const ambiguous = await resolvePreviewNavigation(
      "wiki:Note",
      source,
      firstRoot,
      async () => [firstNote, secondNote],
      "the workspace",
      roots,
    );
    assert.equal(ambiguous.kind, "blocked");
    const unique = await resolvePreviewNavigation(
      "wiki:Note",
      source,
      firstRoot,
      async () => [secondNote],
      "the workspace",
      roots,
    );
    assert.deepEqual(unique, { kind: "local", path: fs.realpathSync(secondNote), suffix: "" });
  } finally {
    fs.rmSync(firstRoot, { recursive: true, force: true });
    fs.rmSync(secondRoot, { recursive: true, force: true });
  }
});

test("discovers bare wikilinks before accepting an active-root sibling", async () => {
  const firstRoot = fs.mkdtempSync(path.join(os.tmpdir(), "studio-bare-wiki-a-"));
  const secondRoot = fs.mkdtempSync(path.join(os.tmpdir(), "studio-bare-wiki-b-"));
  try {
    const source = path.join(firstRoot, "active.md");
    const firstNote = path.join(firstRoot, "Note.md");
    const secondNote = path.join(secondRoot, "Note.md");
    fs.writeFileSync(source, "# Active\n");
    fs.writeFileSync(firstNote, "# First\n");
    fs.writeFileSync(secondNote, "# Second\n");
    const navigation = await resolvePreviewNavigation(
      "wiki:Note",
      source,
      firstRoot,
      async () => [firstNote, secondNote],
      "the workspace",
      [firstRoot, secondRoot],
    );
    assert.deepEqual(navigation, {
      kind: "blocked",
      reason: "The wikilink is ambiguous; use a relative path to choose a note.",
    });
  } finally {
    fs.rmSync(firstRoot, { recursive: true, force: true });
    fs.rmSync(secondRoot, { recursive: true, force: true });
  }
});

test("classifies relative links without touching the filesystem", () => {
  assert.deepEqual(classifyPreviewReference("references/PROPERTIES.md"), { kind: "relative", value: "references/PROPERTIES.md" });
  assert.equal(classifyPreviewReference("wiki:Note").kind, "wiki");
  for (const request of ["wiki:javascript:alert(1)", "wiki:%2Fetc/passwd", "%00.md", "%5Csecret", "//example.test"]) {
    assert.equal(classifyPreviewReference(request).kind, "blocked", request);
  }
});

test("discovers wikilinks on demand and refuses ambiguous or escaping targets", async () => {

test("allows document-relative resolved targets outside a workspace root only in that mode", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "studio-document-relative-"));
  const sourceDirectory = path.join(root, "docs");
  const source = path.join(sourceDirectory, "source.md");
  const outside = path.join(root, "outside.md");
  try {
    fs.mkdirSync(sourceDirectory);
    fs.writeFileSync(source, "# Source\n");
    fs.writeFileSync(outside, "# Outside\n");

    assert.deepEqual(
      validateResolvedPreviewNavigation(outside, "", [sourceDirectory], "the workspace", true),
      { kind: "local", path: fs.realpathSync(outside), suffix: "" },
    );
    assert.equal(
      validateResolvedPreviewNavigation(outside, "", [sourceDirectory], "the workspace").kind,
      "blocked",
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "studio-wiki-"));
  try {
    fs.mkdirSync(path.join(root, "notes"));
    fs.mkdirSync(path.join(root, "other"));
    const source = path.join(root, "active.md");
    const note = path.join(root, "notes", "Note.md");
    fs.writeFileSync(note, "# Heading\n");
    let searches = 0;
    const discover = async () => { searches += 1; return [note]; };
    assert.deepEqual(await resolvePreviewNavigation("wiki:Note#Heading", source, root, discover), {
      kind: "local", path: fs.realpathSync(note), suffix: "#Heading",
    });
    assert.equal(searches, 1);
    assert.equal((await resolvePreviewNavigation("wiki:notes/Note", source, root, discover)).kind, "local");
    assert.equal(searches, 1);
    const duplicate = path.join(root, "other", "Note.md");
    fs.writeFileSync(duplicate, "# Duplicate\n");
    const ambiguous = await resolvePreviewNavigation("wiki:Note", source, root, async () => [note, duplicate]);
    assert.equal(ambiguous.kind, "blocked");
    assert.equal((await resolvePreviewNavigation("wiki:../outside", source, root, discover)).kind, "blocked");
    fs.writeFileSync(path.join(root, "Note.md"), "# Local\n");
    assert.equal((await resolvePreviewNavigation("wiki:Note", source, root, discover)).kind, "local");
    assert.equal(searches, 2);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("classifies anchors, external links, and workspace-local files", () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "liveview-navigation-test-"));
  try {
    const sourceDirectory = path.join(workspaceRoot, "chapters");
    const targetDirectory = path.join(workspaceRoot, "docs");
    fs.mkdirSync(sourceDirectory);
    fs.mkdirSync(targetDirectory);
    const activeSourceFile = path.join(sourceDirectory, "active.md");
    const targetPath = path.join(targetDirectory, "target.md");
    fs.writeFileSync(activeSourceFile, "# Active\n");
    fs.writeFileSync(targetPath, "# Target\n");

    assert.deepEqual(
      validatePreviewNavigation("#section-2", activeSourceFile, workspaceRoot),
      { kind: "anchor", value: "#section-2" },
    );
    assert.deepEqual(
      validatePreviewNavigation("https://example.test/docs", activeSourceFile, workspaceRoot),
      { kind: "external", value: "https://example.test/docs" },
    );
    assert.deepEqual(
      validatePreviewNavigation("../docs/target.md?view=1#heading", activeSourceFile, workspaceRoot),
      { kind: "local", path: fs.realpathSync(targetPath), suffix: "?view=1#heading" },
    );
  } finally {
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
  }
});

test("blocks unsafe anchors, schemes, and paths", () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "liveview-navigation-test-"));
  try {
    const activeSourceFile = path.join(workspaceRoot, "active.md");
    fs.writeFileSync(activeSourceFile, "# Active\n");

    for (const request of [
      "#not a valid anchor",
      "javascript:alert(1)",
      "file:///tmp/secret",
      "/tmp/secret",
      "../secret.md",
    ]) {
      assert.equal(
        validatePreviewNavigation(request, activeSourceFile, workspaceRoot).kind,
        "blocked",
        request,
      );
    }
  } finally {
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
  }
});
