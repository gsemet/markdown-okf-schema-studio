import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import { parseDocument } from "yaml";

import {
  analyzeFrontmatter,
  createFrontmatterFieldPatch,
  createFrontmatterFieldRemovePatch,
  createFrontmatterFieldRenamePatch,
  effectiveProperties,
  extractFrontmatter,
  fieldIconType,
  findSchemaDirectory,
  frontmatterAddPlacement,
  isPlainSafeScalar,
  frontmatterLinkIdentity,
  matchSchemaFile,
  parseYamlValue,
  resolveSchemaRefs,
  setSchemaFileReaderForTests,
} from "../../../src/core/frontmatter/okfFrontmatter";
import { nodeSchemaFiles } from "../../../src/node-services/schemaFiles";
import { inspectFrontmatterLinks } from "../../../src/core/frontmatter/fileLinks";

// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-004
// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-029
// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-037
// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-043
// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-001
// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-019
// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-023
// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-029
// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-039
// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-046
// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-050
// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-055
// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-060
// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-084
// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-005

interface SyntheticFs {
  root: string;
}

function makeSyntheticFs(files: Record<string, string>): SyntheticFs {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "okf-frontmatter-"));
  for (const [relative, content] of Object.entries(files)) {
    const target = path.join(root, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  return { root };
}

function baseSchema(): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      type: { type: "string" },
      id: { type: "string" },
      uuid: { type: "string", format: "uuid" },
    },
    required: ["type", "id", "uuid"],
  };
}

test.afterEach(() => {
  setSchemaFileReaderForTests(undefined);
});

test("extractFrontmatter detects and parses the leading YAML block", () => {
  const extraction = extractFrontmatter("---\ntype: finding\nid: F-1\n---\n\nBody.\n");
  assert.equal(extraction.present, true);
  assert.equal(extraction.error, undefined);
  assert.deepEqual(
    { type: "finding", id: "F-1" },
    extraction.frontmatter,
  );
});

test("fieldIconType maps schema declarations and generic values to display types", () => {
  assert.equal(fieldIconType({ enum: ["a", "b"] }, "a", ["a", "b"]), "enum");
  assert.equal(fieldIconType({ const: "SwRS" }, "SwRS", null), "enum");
  assert.equal(fieldIconType({ type: "boolean" }, true, null), "checkbox");
  assert.equal(fieldIconType({ type: ["string", "null"] }, "x", null), "text");
  assert.equal(fieldIconType({ type: "array", items: { type: "string" } }, [], null), "list");
  assert.equal(fieldIconType({ type: "string", format: "uuid" }, "u", null), "text");
  assert.equal(fieldIconType({ type: "string", format: "date-time" }, "d", null), "datetime");
  assert.equal(fieldIconType(undefined, ["x"], null), "list");
  assert.equal(fieldIconType(undefined, true, null), "checkbox");
  assert.equal(fieldIconType(undefined, "plain", null), "unknown");
});

test("frontmatter field patches preserve comments, fences, line endings, and body", () => {
  const source = "---\r\ntype: finding\r\n# Keep this note\r\nid: F-1\r\n---\r\n\r\nBody stays untouched.\r\n";
  const patch = createFrontmatterFieldPatch(source, "id", "F-2");
  assert.ok(patch);
  const updated = source.slice(0, patch.start) + patch.text + source.slice(patch.end);

  assert.match(updated, /# Keep this note\r\n/u);
  assert.match(updated, /id: F-2\r\n/u);
  assert.match(updated, /---\r\n\r\nBody stays untouched\.\r\n$/u);
  assert.equal(extractFrontmatter(updated).frontmatter?.id, "F-2");
  assert.doesNotMatch(patch.text, /(?<!\r)\n/u);
});

test("frontmatter scalar and object edits preserve YAML node metadata", () => {
  const source = [
    "---",
    "target: old.md # keep target",
    "metadata: # keep metadata",
    "  # keep nested metadata",
    "  owner: old # keep owner",
    "  enabled: true",
    "---",
    "",
    "Body stays untouched.",
    "",
  ].join("\n");
  const scalarPatch = createFrontmatterFieldPatch(source, "target", "new.md");
  assert.ok(scalarPatch);
  const scalarUpdated = source.slice(0, scalarPatch.start)
    + scalarPatch.text + source.slice(scalarPatch.end);
  const objectPatch = createFrontmatterFieldPatch(
    scalarUpdated,
    "metadata",
    { owner: "new", enabled: false, added: "value" },
  );
  assert.ok(objectPatch);
  const updated = scalarUpdated.slice(0, objectPatch.start)
    + objectPatch.text + scalarUpdated.slice(objectPatch.end);

  assert.match(updated, /target: new\.md # keep target\n/u);
  assert.match(updated, /metadata:\n  # keep metadata\n  # keep nested metadata\n/u);
  assert.match(updated, /  owner: new # keep owner\n/u);
  assert.match(updated, /  enabled: false\n  added: value\n/u);
  assert.match(updated, /---\n\nBody stays untouched\.\n$/u);
});

test("frontmatter array edits keep comments attached to reordered items", () => {
  const source = [
    "---",
    "links:",
    "  - alpha.md # alpha note",
    "  - beta.md # beta note",
    "other: keep",
    "---",
    "",
  ].join("\n");
  const patch = createFrontmatterFieldPatch(source, "links", ["beta.md", "alpha.md", "gamma.md"]);
  assert.ok(patch);
  const updated = source.slice(0, patch.start) + patch.text + source.slice(patch.end);

  assert.match(updated, /  - beta\.md # beta note\n  - alpha\.md # alpha note\n  - gamma\.md\n/u);
  assert.equal(extractFrontmatter(updated).frontmatter?.links instanceof Array, true);
});

test("frontmatter key renames preserve comments and reject duplicate destinations", () => {
  const source = [
    "---",
    "type: finding",
    "# Keep this key comment",
    "legacy_summary: Existing summary",
    "status: draft",
    "---",
    "",
    "Body stays untouched.",
    "",
  ].join("\n");
  const patch = createFrontmatterFieldRenamePatch(source, "legacy_summary", "summary");
  assert.ok(patch);
  const updated = source.slice(0, patch.start) + patch.text + source.slice(patch.end);

  assert.match(updated, /# Keep this key comment\nsummary: Existing summary\n/u);
  assert.ok(updated.indexOf("summary:") < updated.indexOf("status:"));
  assert.equal(extractFrontmatter(updated).frontmatter?.summary, "Existing summary");
  assert.match(updated, /---\n\nBody stays untouched\.\n$/u);
  assert.equal(createFrontmatterFieldRenamePatch(source, "legacy_summary", "status"), undefined);
  assert.equal(createFrontmatterFieldRenamePatch(source, "legacy_summary", "  "), undefined);
});

test("frontmatter field removal preserves comments, fences, and body", () => {
  const source = [
    "---",
    "type: finding # Keep this comment",
    "legacy_summary: Existing summary",
    "status: draft",
    "---",
    "",
    "Body stays untouched.",
    "",
  ].join("\n");
  const patch = createFrontmatterFieldRemovePatch(source, "legacy_summary");
  assert.ok(patch);
  const updated = source.slice(0, patch.start) + patch.text + source.slice(patch.end);

  assert.match(updated, /type: finding # Keep this comment\nstatus: draft\n/u);
  assert.doesNotMatch(updated, /legacy_summary/u);
  assert.match(updated, /---\n\nBody stays untouched\.\n$/u);
  assert.equal(createFrontmatterFieldRemovePatch(source, "missing"), undefined);
});

test("extractFrontmatter rejects a document without frontmatter", () => {
  const extraction = extractFrontmatter("# Just a heading\n\nNo frontmatter here.\n");
  assert.equal(extraction.present, false);
});

test("extractFrontmatter reports invalid YAML with the parse error", () => {
  const extraction = extractFrontmatter("---\nfoo: [unclosed\n---\n");
  assert.equal(extraction.present, true);
  assert.ok(extraction.error);
});

test("parseYamlValue handles structured values and rejects malformed YAML", () => {
  const parsed = parseYamlValue("owner: platform\nlabels:\n  - alpha\n  - beta\n");
  assert.ok(parsed.valid);
  assert.deepEqual(parsed.value, { owner: "platform", labels: ["alpha", "beta"] });
  assert.equal(parseYamlValue("owner: [unclosed").valid, false);
  assert.equal(parseYamlValue("  \n").valid, false);
});

test("findSchemaDirectory walks ancestors and prefers _schema over _schemas", () => {
  const fsRoot = makeSyntheticFs({
    "_schemas/decoy.txt": "decoy",
    "bundle/_schema/base.schema.yaml": "type: object",
    "bundle/findings/doc.md": "body",
  });
  try {
    assert.equal(
      findSchemaDirectory(nodeSchemaFiles, path.join(fsRoot.root, "bundle/findings/doc.md")),
      path.join(fsRoot.root, "bundle/_schema"),
    );
  } finally {
    fs.rmSync(fsRoot.root, { recursive: true, force: true });
  }
});

test("findSchemaDirectory still finds _schemas when _schema is absent", () => {
  const fsRoot = makeSyntheticFs({
    "bundle/_schemas/concept.schema.yaml": "type: object",
    "bundle/notes/doc.md": "body",
  });
  try {
    assert.equal(
      findSchemaDirectory(nodeSchemaFiles, path.join(fsRoot.root, "bundle/notes/doc.md")),
      path.join(fsRoot.root, "bundle/_schemas"),
    );
  } finally {
    fs.rmSync(fsRoot.root, { recursive: true, force: true });
  }
});

test("matchSchemaFile matches case-insensitively on the stem before .schema", () => {
  const fsRoot = makeSyntheticFs({
    "Concept.schema.yaml": "type: object",
    "what-a-story.schema.yml": "type: object",
    "ignored.txt": "",
  });
  try {
    const schemaDir = fsRoot.root;
    const concept = matchSchemaFile(nodeSchemaFiles, schemaDir, "concept");
    assert.ok(concept);
    assert.equal(concept.path, path.join(schemaDir, "Concept.schema.yaml"));
    const story = matchSchemaFile(nodeSchemaFiles, schemaDir, "WHAT-A-STORY");
    assert.ok(story);
    assert.equal(story.extension, ".yml");
    assert.equal(matchSchemaFile(nodeSchemaFiles, schemaDir, "missing"), undefined);
  } finally {
    fs.rmSync(fsRoot.root, { recursive: true, force: true });
  }
});

test("resolveSchemaRefs inlines relative references with extension fallbacks", () => {
  const fsRoot = makeSyntheticFs({
    "_schema/base.schema.yml": "type: object\nproperties:\n  id:\n    type: string\n",
    "_schema/finding.schema.yaml": "allOf:\n  - $ref: base.schema\n  - type: object\n",
  });
  try {
    const schemaPath = path.join(fsRoot.root, "_schema/finding.schema.yaml");
    const schemaText = fs.readFileSync(schemaPath, "utf8");
    const parsed = parseDocument(schemaText).toJS() as Record<string, unknown>;
    const resolved = resolveSchemaRefs(nodeSchemaFiles, parsed, path.join(fsRoot.root, "_schema"));
    const allOf = resolved.allOf as Record<string, unknown>[];
    assert.ok(Array.isArray(allOf));
    const inlined = allOf[0] as Record<string, unknown>;
    assert.deepEqual(inlined.properties, { id: { type: "string" } });
    // The $ref key must be gone after inlining.
    assert.ok(!("$ref" in inlined));
  } finally {
    fs.rmSync(fsRoot.root, { recursive: true, force: true });
  }
});

test("effectiveProperties collapses allOf branches and collects required", () => {
  const effective = effectiveProperties({
    allOf: [
      baseSchema(),
      { properties: { tier: { const: "core" } }, required: ["tier"] },
    ],
  });
  assert.deepEqual(Object.keys(effective.properties), ["type", "id", "uuid", "tier"]);
  assert.deepEqual([...effective.required], ["type", "id", "uuid", "tier"]);
});

test("analyzeFrontmatter yields schema-ordered fields with docs and enums", () => {
  const fsRoot = makeSyntheticFs({
    "_schema/base.schema.yaml": [
      "$schema: https://json-schema.org/draft/2020-12/schema",
      "type: object",
      "properties:",
      "  type: { type: string, title: Document type }",
      "  lifecycle: { enum: [draft, active, retired] }",
      "required: [type]",
      "additionalProperties: true",
    ].join("\n"),
    "_schema/finding.schema.yaml": [
      "allOf:",
      "  - $ref: base.schema.yaml",
      "  - type: object",
      "    properties:",
      "      type: { const: finding }",
      "      verified: { type: boolean, title: Verified, description: Independently checked. }",
      "    required: [type, verified]",
    ].join("\n"),
    "findings/F-1.md": "---\ntype: finding\nid: F-1\nlifecycle: draft\nverified: true\n---\nBody.\n",
  });
  try {
    const result = analyzeFrontmatter({
      schemaFiles: nodeSchemaFiles,
      filePath: path.join(fsRoot.root, "findings/F-1.md"),
      sourceText: fs.readFileSync(path.join(fsRoot.root, "findings/F-1.md"), "utf8"),
      stopDir: fsRoot.root,
      strictAdditionalProperties: false,
    });
    assert.equal(result.present, true);
    assert.equal(result.schemaFound, true);
    assert.equal(result.orderMode, "schema");
    assert.deepEqual(result.availableKeys, ["type", "lifecycle", "verified"]);
    // Schema order first (base: type, lifecycle; finding: verified), then
    // unknown fields in YAML order (id is not declared in this schema pair).
    assert.deepEqual(result.fields.map((field) => field.name), ["type", "lifecycle", "verified", "id"]);
    assert.equal(result.fields[3].known, false);
    const lifecycle = result.fields[1];
    assert.deepEqual(lifecycle.enums ?? [], ["draft", "active", "retired"]);
    const verified = result.fields[2];
    assert.deepEqual(verified.doc ?? {}, {
      title: "Verified",
      // Schema declarations do not alter prose descriptions.
      description: "Independently checked.",
    });
    assert.equal(result.summary.errors, 0);
  } finally {
    fs.rmSync(fsRoot.root, { recursive: true, force: true });
  }
});

test("nullable reset metadata preserves declared nullability while conditional validation stays active", () => {
  const fsRoot = makeSyntheticFs({
    "_schema/swrs.schema.yaml": [
      "type: object",
      "properties:",
      "  type: { const: SwRS }",
      "  annotation_exemption: { type: boolean }",
      "  exemption_reason:",
      "    type: [string, 'null']",
      "    minLength: 1",
      "    description: Justification for coverage exemption.",
      "required: [type, annotation_exemption]",
      "allOf:",
      "  - if:",
      "      properties:",
      "        annotation_exemption: { const: true }",
      "    then:",
      "      required: [exemption_reason]",
      "      properties:",
      "        exemption_reason: { type: string, minLength: 1 }",
    ].join("\n"),
  });
  try {
    for (const exempt of [false, true]) {
      const result = analyzeFrontmatter({
        schemaFiles: nodeSchemaFiles,
        filePath: path.join(fsRoot.root, "requirement.md"),
        sourceText: `---\ntype: SwRS\nannotation_exemption: ${exempt}\nexemption_reason: null\n---\n`,
        stopDir: fsRoot.root,
        strictAdditionalProperties: false,
      });
      const field = result.fields.find((candidate) => candidate.name === "exemption_reason");
      assert.ok(field);
      assert.equal(field.nullable, true);
      assert.equal(field.fieldType, "text");
      assert.equal(field.doc?.description, "Justification for coverage exemption.");
      assert.equal(field.issues.some((issue) => issue.severity === "error"), exempt);

      const missing = analyzeFrontmatter({
        schemaFiles: nodeSchemaFiles,
        filePath: path.join(fsRoot.root, "requirement.md"),
        sourceText: `---\ntype: SwRS\nannotation_exemption: ${exempt}\n---\n`,
        stopDir: fsRoot.root,
        strictAdditionalProperties: false,
      });
      assert.equal(missing.missingRequiredFields.includes("exemption_reason"), exempt);
      if (exempt) {
        assert.equal(missing.fields.find((candidate) => candidate.name === "exemption_reason")?.nullable, true);
      }
    }
  } finally {
    fs.rmSync(fsRoot.root, { recursive: true, force: true });
  }
});

test("frontmatter without a type skips schema discovery and validation", () => {
  const fsRoot = makeSyntheticFs({
    "_schema/base.schema.yaml": [
      "type: object",
      "properties:",
      "  type: { type: string }",
      "  uuid: { type: string, format: uuid }",
      "  lifecycle: { enum: [draft, active] }",
      "required: [type, uuid]",
    ].join("\n"),
    "docs/D-1.md": "---\nuuid: nope\nlifecycle: frozen\n---\nBody.\n",
  });
  try {
    const result = analyzeFrontmatter({
      schemaFiles: nodeSchemaFiles,
      filePath: path.join(fsRoot.root, "docs/D-1.md"),
      sourceText: "---\nuuid: nope\nlifecycle: frozen\n---\nBody.\n",
      stopDir: fsRoot.root,
      strictAdditionalProperties: false,
    });
    // No "type" field at all: silently ignored per the searched-schema rule.
    assert.equal(result.schemaFound, false);
    assert.equal(result.info.length, 0);
    assert.equal(result.summary.errors, 0);
  } finally {
    fs.rmSync(fsRoot.root, { recursive: true, force: true });
  }
});

test("analyzeFrontmatter surfaces an info when the type has no schema", () => {
  const fsRoot = makeSyntheticFs({
    "_schema/concept.schema.yaml": "type: object\n",
    "docs/D-1.md": "---\ntype: mystery\nname: x\n---\nBody.\n",
  });
  try {
    const result = analyzeFrontmatter({
      schemaFiles: nodeSchemaFiles,
      filePath: path.join(fsRoot.root, "docs/D-1.md"),
      sourceText: "---\ntype: mystery\nname: x\n---\nBody.\n",
      stopDir: fsRoot.root,
      strictAdditionalProperties: false,
    });
    assert.equal(result.schemaFound, false);
    assert.equal(result.summary.infos, 1);
    assert.match(result.info[0].message, /No schema found for type "mystery"/u);
  } finally {
    fs.rmSync(fsRoot.root, { recursive: true, force: true });
  }
});

test("reduced mode explains that schema validation needs a trusted workspace", () => {
  const fsRoot = makeSyntheticFs({
    "_schema/finding.schema.yaml": "type: object\nproperties:\n  status: { enum: [draft, active] }\n",
    "docs/finding.md": "---\ntype: finding\nstatus: draft\n---\nBody.\n",
  });
  try {
    const result = analyzeFrontmatter({
      schemaFiles: nodeSchemaFiles,
      filePath: path.join(fsRoot.root, "docs/finding.md"),
      sourceText: "---\ntype: finding\nstatus: draft\n---\nBody.\n",
      stopDir: fsRoot.root,
      allowSchemaResolution: false,
      strictAdditionalProperties: false,
    });
    assert.equal(result.schemaFound, false);
    assert.equal(result.summary.infos, 1);
    assert.match(result.info[0].message, /Schema validation requires a trusted workspace/u);
  } finally {
    fs.rmSync(fsRoot.root, { recursive: true, force: true });
  }
});

test("unmatched OKF-like SKILL frontmatter remains generic and skips schema validation", () => {
  const source = [
    "---",
    "type: skill",
    "id: internal-playbook",
    "name: Local tooling guide",
    "description: A generic resource with nested YAML metadata.",
    "status: internal-only",
    "required:",
    "  - name",
    "  - summary",
    "properties:",
    "  status:",
    "    enum: [ready]",
    "allowed-tools:",
    "  - Read",
    "  - Bash(uv run *)",
    "metadata:",
    "  owner: platform",
    "  review:",
    "    gate: none",
    "    attempts: 3",
    "---",
    "# Local tooling guide",
    "",
  ].join("\n");
  const fsRoot = makeSyntheticFs({
    "_schema/swrs.schema.yaml": [
      "type: object",
      "properties:",
      "  type: { const: swrs }",
      "  status: { enum: [draft, active] }",
      "required: [type, uuid]",
    ].join("\n"),
    "skills/dev/SKILL.md": source,
  });
  try {
    const result = analyzeFrontmatter({
      schemaFiles: nodeSchemaFiles,
      filePath: path.join(fsRoot.root, "skills/dev/SKILL.md"),
      sourceText: source,
      stopDir: fsRoot.root,
      strictAdditionalProperties: true,
    });

    assert.equal(result.schemaFound, false);
    assert.equal(result.orderMode, "yaml");
    assert.deepEqual(result.missingRequiredFields, []);
    assert.deepEqual(result.summary, { errors: 0, warnings: 0, infos: 1 });
    assert.match(result.info[0].message, /No schema found for type "skill"/u);
    const fields = new Map(result.fields.map((field) => [field.name, field]));
    assert.deepEqual(fields.get("allowed-tools")?.value, ["Read", "Bash(uv run *)"]);
    assert.deepEqual(fields.get("metadata")?.value, {
      owner: "platform",
      review: { gate: "none", attempts: 3 },
    });
    assert.equal(fields.get("status")?.value, "internal-only");
    for (const field of fields.values()) {
      assert.deepEqual(field.issues, []);
      assert.equal(field.doc, null);
      assert.equal(field.enums, null);
    }
  } finally {
    fs.rmSync(fsRoot.root, { recursive: true, force: true });
  }
});

test("analyzeFrontmatter validates enums, consts, and formats against the schema", () => {
  const fsRoot = makeSyntheticFs({
    "_schema/base.schema.yaml": [
      "type: object",
      "properties:",
      "  type: { type: string }",
      "  uuid: { type: string, format: uuid }",
      "required: [type, uuid]",
    ].join("\n"),
    "_schema/finding.schema.yaml": [
      "allOf:",
      "  - $ref: base.schema.yaml",
      "  - type: object",
      "    properties:",
      "      type: { const: finding }",
      "      lifecycle: { enum: [draft, active] }",
      "      tier: { const: core }",
    ].join("\n"),
    "findings/F-2.md": "---\ntype: finding\nuuid: not-a-uuid\nlifecycle: frozen\ntier: rim\n---\nBody.\n",
  });
  try {
    const result = analyzeFrontmatter({
      schemaFiles: nodeSchemaFiles,
      filePath: path.join(fsRoot.root, "findings/F-2.md"),
      sourceText: fs.readFileSync(path.join(fsRoot.root, "findings/F-2.md"), "utf8"),
      stopDir: fsRoot.root,
      strictAdditionalProperties: false,
    });
    assert.equal(result.schemaFound, true);
    const byName = new Map(result.fields.map((field) => [field.name, field] as const));
    for (const name of ["lifecycle", "uuid", "tier"]) {
      assert.ok(byName.get(name)?.issues.some((issue) => issue.severity === "error"),
        `expected a validation error for ${name}`);
    }
    assert.equal(result.summary.errors, 3);
  } finally {
    fs.rmSync(fsRoot.root, { recursive: true, force: true });
  }
});

test("analyzeFrontmatter inspects annotated scalar and array links without AJV keyword errors", () => {
  const fsRoot = makeSyntheticFs({
    "index.md": "# Bundle\n",
    "log.md": "# Log\n",
    "_schema/note.schema.yaml": [
      "type: object",
      "properties:",
      "  type: { const: note }",
      "  design:",
      "    type: string",
      "    x-okf-link:",
      "      resolution: document-relative",
      "      syntax: wikilink",
      "      basename_marker: '@implements_req'",
      "      id_marker: id",
      "  attachments:",
      "    type: array",
      "    items:",
      "      type: string",
      "      x-okf-link: { resolution: bundle-relative, syntax: plain }",
      "required: [type, design, attachments]",
    ].join("\n"),
    "docs/source.md": "---\ntype: note\ndesign: '[[../design.md#Overview|design]]'\nattachments:\n  - attachments/a.txt\n  - attachments/missing.txt\n---\nBody.\n",
    "design.md": "# Overview\n",
    "attachments/a.txt": "attachment\n",
  });
  try {
    const sourcePath = path.join(fsRoot.root, "docs/source.md");
    const fast = analyzeFrontmatter({
      schemaFiles: nodeSchemaFiles,
      filePath: sourcePath,
      sourceText: fs.readFileSync(sourcePath, "utf8"),
      stopDir: fsRoot.root,
      bundleRoot: fsRoot.root,
      inspectLinks: false,
      strictAdditionalProperties: false,
      workspaceRoots: [fsRoot.root],
    });
    assert.equal(fast.schemaFound, true);
    assert.equal(fast.linkResults?.length, 3);
    assert.ok(fast.linkResults?.every((link) => link.status === "pending"));
    assert.ok(fast.fields.some((field) => field.name === "attachments"));
    assert.equal(fast.summary.errors, 0);

    const result = analyzeFrontmatter({
      schemaFiles: nodeSchemaFiles,
      filePath: sourcePath,
      sourceText: fs.readFileSync(sourcePath, "utf8"),
      stopDir: fsRoot.root,
      bundleRoot: fsRoot.root,
      strictAdditionalProperties: false,
      workspaceRoots: [fsRoot.root],
    });

    assert.equal(result.schemaFound, true);
    assert.equal(result.linkResults?.length, 3);
    const design = result.linkResults?.find((link) => link.fieldPath === "design");
    assert.equal(design?.status, "valid");
    assert.equal(design?.fragment, "Overview");
    assert.equal(design?.label, "design");
    assert.equal(design?.basenameMarker, "@implements_req");
    assert.equal(design?.idMarker, "id");
    assert.equal(design?.resolvedPath, fs.realpathSync(path.join(fsRoot.root, "design.md")));
    const missing = result.linkResults?.find((link) => link.arrayIndex === 1);
    assert.equal(missing?.status, "invalid");
    assert.equal(missing?.code, "E10");
    assert.ok(result.fields.find((field) => field.name === "attachments")?.issues
      .some((issue) => issue.message.startsWith("[E10]")));
    assert.equal(result.summary.errors, 1);
  } finally {
    fs.rmSync(fsRoot.root, { recursive: true, force: true });
  }
});

test("frontmatter link identity prefers the configured id and otherwise uses the basename", () => {
  assert.equal(
    frontmatterLinkIdentity("---\nid: SwRS-demo-001\n---\n", "/tmp/SwRS-file.md", "id"),
    "SwRS-demo-001",
  );
  assert.equal(
    frontmatterLinkIdentity("---\ntitle: Demo\n---\n", "/tmp/SwRS-file.md"),
    "SwRS-file",
  );
  assert.equal(
    frontmatterLinkIdentity("---\ntitle: Demo\n---\n", "/tmp/SwRS-file.md", "id"),
    undefined,
  );
});

test("analyzeFrontmatter attaches nested link results to the parent field", () => {
  const fsRoot = makeSyntheticFs({
    "index.md": "# Bundle\n",
    "_schema/note.schema.yaml": [
      "type: object",
      "properties:",
      "  type: { const: note }",
      "  metadata:",
      "    type: object",
      "    properties:",
      "      target:",
      "        type: string",
      "        x-okf-link: { resolution: document-relative, syntax: plain }",
      "      broken:",
      "        type: string",
      "        x-okf-link: { resolution: document-relative, syntax: plain }",
      "required: [type, metadata]",
    ].join("\n"),
    "docs/source.md": "---\ntype: note\nmetadata:\n  target: ../target.md\n  broken: ../missing.md\n---\n",
    "target.md": "# Target\n",
  });
  try {
    const sourcePath = path.join(fsRoot.root, "docs/source.md");
    const result = analyzeFrontmatter({
      schemaFiles: nodeSchemaFiles,
      filePath: sourcePath,
      sourceText: fs.readFileSync(sourcePath, "utf8"),
      stopDir: fsRoot.root,
      strictAdditionalProperties: false,
      workspaceRoots: [fsRoot.root],
    });
    const target = result.linkResults?.find((link) => link.fieldPath === "metadata.target");
    const broken = result.linkResults?.find((link) => link.fieldPath === "metadata.broken");
    assert.equal(target?.status, "valid");
    assert.equal(broken?.status, "invalid");
    assert.ok(result.fields.find((field) => field.name === "metadata")?.issues
      .some((issue) => issue.message.startsWith("[E10]")));
    assert.equal(result.summary.errors, 1);
  } finally {
    fs.rmSync(fsRoot.root, { recursive: true, force: true });
  }
});

test("file-link union applicability honors pattern and explicit root precedence", () => {
  const firstRoot = fs.mkdtempSync(path.join(os.tmpdir(), "okf-link-root-a-"));
  const secondRoot = fs.mkdtempSync(path.join(os.tmpdir(), "okf-link-root-b-"));
  try {
    fs.mkdirSync(path.join(firstRoot, "_schema"));
    fs.writeFileSync(path.join(firstRoot, "index.md"), "# Bundle\n");
    fs.writeFileSync(path.join(firstRoot, "_schema", "note.schema.yaml"), "type: object\n", "utf8");
    fs.writeFileSync(path.join(firstRoot, "active.md"), "# Active\n", "utf8");
    fs.writeFileSync(path.join(firstRoot, "REQ-1.md"), "# Requirement\n", "utf8");
    fs.writeFileSync(path.join(secondRoot, "REQ-1.md"), "# Other requirement\n", "utf8");
    const schema = {
      type: "object",
      properties: {
        reference: {
          anyOf: [
            {
              type: "string",
              pattern: "^REQ-",
              "x-okf-link": { resolution: "filename-stem", syntax: "plain" },
            },
            { type: "string", pattern: "^OTHER-" },
          ],
        },
        bundle: {
          type: "string",
          "x-okf-link": { resolution: "bundle-relative", syntax: "plain" },
        },
      },
    } as Record<string, unknown>;
    const ambiguous = inspectFrontmatterLinks(
      { reference: "REQ-1", bundle: "REQ-1.md" },
      schema,
      {
        filePath: path.join(firstRoot, "active.md"),
        bundleRoot: path.join(firstRoot, "missing-bundle"),
        workspaceRoots: [firstRoot, secondRoot],
        schemaDirectory: path.join(firstRoot, "_schema"),
      },
    );
    assert.equal(ambiguous.find((link) => link.fieldPath === "reference")?.code, "E10");
    assert.equal(ambiguous.find((link) => link.fieldPath === "bundle")?.code, "W15");
    const ignored = inspectFrontmatterLinks(
      { reference: "OTHER-missing" },
      schema,
      { filePath: path.join(firstRoot, "active.md"), workspaceRoots: [firstRoot, secondRoot] },
    );
    assert.deepEqual(ignored, []);
    fs.rmSync(path.join(secondRoot, "REQ-1.md"));
    const unique = inspectFrontmatterLinks(
      { reference: "REQ-1" },
      schema,
      { filePath: path.join(firstRoot, "active.md"), workspaceRoots: [firstRoot, secondRoot] },
    );
    assert.equal(unique[0]?.status, "valid");
  } finally {
    fs.rmSync(firstRoot, { recursive: true, force: true });
    fs.rmSync(secondRoot, { recursive: true, force: true });
  }
});

test("file-link union applicability preserves boolean local references", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "okf-link-boolean-ref-"));
  try {
    const source = path.join(root, "source.md");
    fs.writeFileSync(source, "# Source\n", "utf8");
    const schema = {
      $defs: { never: false, always: true },
      type: "object",
      properties: {
        falseAnnotatedRef: {
          anyOf: [
            {
              $ref: "#/$defs/never",
              "x-okf-link": { resolution: "document-relative", syntax: "plain" },
            },
            { type: "string" },
          ],
        },
        trueAnnotatedRef: {
          anyOf: [
            {
              $ref: "#/$defs/always",
              "x-okf-link": { resolution: "document-relative", syntax: "plain" },
            },
            { type: "string" },
          ],
        },
      },
    } as Record<string, unknown>;

    const results = inspectFrontmatterLinks(
      { falseAnnotatedRef: "missing.md", trueAnnotatedRef: "missing.md" },
      schema,
      { filePath: source },
    );

    assert.deepEqual(results.map((link) => link.fieldPath), ["trueAnnotatedRef"]);
    assert.equal(results[0]?.code, "E10");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("filename-stem links recheck symlink containment after an internal target drifts", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "okf-link-symlink-drift-"));
  const inside = path.join(root, "inside.md");
  const outside = path.join(os.tmpdir(), `okf-link-outside-${process.pid}.md`);
  const alias = path.join(root, "Alias.md");
  const source = path.join(root, "source.md");
  try {
    fs.writeFileSync(inside, "# Inside\n", "utf8");
    fs.writeFileSync(outside, "# Outside\n", "utf8");
    fs.writeFileSync(source, "# Source\n", "utf8");
    try {
      fs.symlinkSync(inside, alias);
    } catch (error) {
      assert.fail(`symlink creation unavailable: ${String(error)}`);
    }
    const schema = {
      properties: {
        reference: {
          type: "string",
          "x-okf-link": { resolution: "filename-stem", syntax: "plain" },
        },
      },
    } as Record<string, unknown>;
    const initial = inspectFrontmatterLinks(
      { reference: "Alias" },
      schema,
      { filePath: source, bundleRoot: root },
    );
    assert.equal(initial[0]?.status, "valid");
    assert.equal(initial[0]?.resolvedPath, fs.realpathSync(inside));

    fs.unlinkSync(alias);
    fs.symlinkSync(outside, alias);
    const drifted = inspectFrontmatterLinks(
      { reference: "Alias" },
      schema,
      { filePath: source, bundleRoot: root },
    );
    assert.equal(drifted[0]?.status, "invalid");
    assert.equal(drifted[0]?.code, "E10");
    assert.match(drifted[0]?.message ?? "", /escapes/u);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(outside, { force: true });
  }
});

test("filename-stem links report W15 when matching candidates are unavailable", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "okf-link-unavailable-stem-"));
  const source = path.join(root, "source.md");
  const unavailable = path.join(root, "Unavailable.md");
  try {
    fs.writeFileSync(source, "# Source\n", "utf8");
    fs.symlinkSync(path.join(root, "missing.md"), unavailable);
    const results = inspectFrontmatterLinks(
      { reference: "Unavailable" },
      {
        properties: {
          reference: {
            type: "string",
            "x-okf-link": { resolution: "filename-stem", syntax: "plain" },
          },
        },
      },
      { filePath: source, bundleRoot: root },
    );
    assert.equal(results[0]?.status, "unavailable");
    assert.equal(results[0]?.code, "W15");
    assert.match(results[0]?.message ?? "", /workspace may be unavailable/u);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("strict mode warns on unknown fields; lenient mode does not", () => {
  const schemaYaml = [
    "type: object",
    "properties:",
    "  type: { type: string }",
    "required: [type]",
    "additionalProperties: true",
  ].join("\n");
  const fsLenient = makeSyntheticFs({ "_schema/note.schema.yaml": schemaYaml, "docs/D.md": "x" });
  const fsStrict = makeSyntheticFs({ "_schema/note.schema.yaml": schemaYaml, "docs/D.md": "x" });
  const source = "---\ntype: note\nbonus: surprise\n---\nBody.\n";
  try {
    const lenient = analyzeFrontmatter({
      schemaFiles: nodeSchemaFiles,
      filePath: path.join(fsLenient.root, "docs/D.md"),
      sourceText: source,
      stopDir: fsLenient.root,
      strictAdditionalProperties: false,
    });
    assert.equal(lenient.summary.warnings, 0);
    const strict = analyzeFrontmatter({
      schemaFiles: nodeSchemaFiles,
      filePath: path.join(fsStrict.root, "docs/D.md"),
      sourceText: source,
      stopDir: fsStrict.root,
      strictAdditionalProperties: true,
    });
    const bonus = strict.fields.find((field) => field.name === "bonus");
    assert.ok(bonus);
    assert.equal(bonus.known, false);
    assert.equal(bonus.issues.length, 1);
    assert.equal(bonus.issues[0].severity, "warning");
    assert.equal(strict.summary.warnings, 1);
  } finally {
    fs.rmSync(fsLenient.root, { recursive: true, force: true });
    fs.rmSync(fsStrict.root, { recursive: true, force: true });
  }
});

test("missing required fields are exposed as an ordered schema summary", () => {
  const fsRoot = makeSyntheticFs({
    "_schema/note.schema.yaml": [
      "type: object",
      "properties:",
      "  type: { type: string }",
      "  uuid: { type: string }",
      "required: [type, uuid]",
    ].join("\n"),
    "docs/D.md": "---\ntype: note\n---\nBody.\n",
  });
  try {
    const result = analyzeFrontmatter({
      schemaFiles: nodeSchemaFiles,
      filePath: path.join(fsRoot.root, "docs/D.md"),
      sourceText: "---\ntype: note\n---\nBody.\n",
      stopDir: fsRoot.root,
      strictAdditionalProperties: false,
    });
    assert.deepEqual(result.missingRequiredFields, ["uuid"]);
    const missingField = result.fields.find((field) => field.name === "uuid");
    assert.ok(missingField?.issues.some((issue) => issue.severity === "error"));
  } finally {
    fs.rmSync(fsRoot.root, { recursive: true, force: true });
  }
});

test("json5 and json schema formats parse correctly", () => {
  const fsRoot = makeSyntheticFs({
    "_schema/playbook.schema.json5": "// comment\n{\n  \"type\": \"object\",\n  \"properties\": { \"type\": { \"const\": \"playbook\" } },\n  \"required\": [\"type\"]\n}\n",
    "_schema/concept.schema.json": JSON.stringify({
      type: "object",
      properties: { type: { const: "concept" }, summary: { type: "string" } },
      required: ["type", "summary"],
    }),
    "notes/P-1.md": "---\ntype: playbook\n---\n",
    "notes/C-1.md": "---\ntype: concept\nsummary: ok\n---\n",
  });
  try {
    const playbook = analyzeFrontmatter({
      schemaFiles: nodeSchemaFiles,
      filePath: path.join(fsRoot.root, "notes/P-1.md"),
      sourceText: "---\ntype: playbook\n---\n",
      stopDir: fsRoot.root,
      strictAdditionalProperties: false,
    });
    assert.equal(playbook.schemaFound, true);
    assert.equal(playbook.summary.errors, 0);
    const concept = analyzeFrontmatter({
      schemaFiles: nodeSchemaFiles,
      filePath: path.join(fsRoot.root, "notes/C-1.md"),
      sourceText: "---\ntype: concept\nsummary: ok\n---\n",
      stopDir: fsRoot.root,
      strictAdditionalProperties: false,
    });
    assert.equal(concept.schemaFound, true);
    assert.equal(concept.summary.errors, 0);
  } finally {
    fs.rmSync(fsRoot.root, { recursive: true, force: true });
  }
});

test("schema declarations do not become description annotations", () => {
  const fsRoot = makeSyntheticFs({
    "_schema/base.schema.yaml": [
      "type: object",
      "properties:",
      "  type: { type: string }",
      "  uuid: { type: string, format: uuid }",
      "  derives_from: { type: array, items: { type: string } }",
      "required: [type, uuid]",
    ].join("\n"),
    "_schema/swrs.schema.yaml": [
      "allOf:",
      "  - $ref: base.schema.yaml",
      "  - type: object",
      "    properties:",
      "      type: { const: SwRS }",
      "      annotation_exemption: { type: boolean }",
      "    required: [type, annotation_exemption]",
    ].join("\n"),
    "swrs/S-1.md": "---\ntype: SwRS\nuuid: 00000000-0000-4000-8000-000000000003\nderives_from: [A-1]\n---\nBody.\n",
  });
  try {
    const result = analyzeFrontmatter({
      schemaFiles: nodeSchemaFiles,
      filePath: path.join(fsRoot.root, "swrs/S-1.md"),
      sourceText: fs.readFileSync(path.join(fsRoot.root, "swrs/S-1.md"), "utf8"),
      stopDir: fsRoot.root,
      strictAdditionalProperties: false,
    });
    assert.equal(result.schemaFound, true);
    const byName = new Map(result.fields.map((field) => [field.name, field]));
    assert.equal(byName.get("type")?.doc, null);
    assert.equal(byName.get("uuid")?.doc, null);
    assert.equal(byName.get("derives_from")?.doc, null);
    assert.deepEqual(result.missingRequiredFields, ["annotation_exemption"]);
  } finally {
    fs.rmSync(fsRoot.root, { recursive: true, force: true });
  }
});

function applyFieldPatch(source: string, patch: { start: number; end: number; text: string }): string {
  return source.slice(0, patch.start) + patch.text + source.slice(patch.end);
}

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

test("value patch for an anchored value still writes correct data", () => {
  const source = "---\na: &x 1\nb: 3\n---\n";
  const patch = createFrontmatterFieldPatch(source, "a", 2);
  assert.ok(patch);
  const updated = applyFieldPatch(source, patch);
  assert.deepEqual(extractFrontmatter(updated).frontmatter, { a: 2, b: 3 });
});

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

test("appending a sequence item keeps a comment line between existing items", () => {
  const source = "---\ntags:\n  - one\n  # note\n  - two\nstatus: draft\n---\n";
  const patch = createFrontmatterFieldPatch(source, "tags", ["one", "two", "three"]);
  assert.ok(patch);
  const updated = applyFieldPatch(source, patch);
  assert.match(updated, /  # note\n/u);
  assert.deepEqual(extractFrontmatter(updated).frontmatter?.tags, ["one", "two", "three"]);
  assert.equal(extractFrontmatter(updated).frontmatter?.status, "draft");
});

test("value patch with an unchanged value leaves the document text identical", () => {
  const source = "---\ntype: finding\n# keep\ntitle: Alpha  # note\ntags:\n  - one\n  - two\n---\nBody\n";
  const patch = createFrontmatterFieldPatch(source, "title", "Alpha");
  assert.ok(patch);
  assert.equal(applyFieldPatch(source, patch), source);
  const listPatch = createFrontmatterFieldPatch(source, "tags", ["one", "two"]);
  assert.ok(listPatch);
  assert.equal(applyFieldPatch(source, listPatch), source);
});

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

test("frontmatter field removal keeps the comment lines above the removed key", () => {
  const source = "---\ntype: x\n# about legacy\nlegacy: 1\n# about status\nstatus: draft\n---\n";
  const patch = createFrontmatterFieldRemovePatch(source, "legacy");
  assert.ok(patch);
  assert.equal(
    source.slice(0, patch.start) + patch.text + source.slice(patch.end),
    "---\ntype: x\n# about legacy\n# about status\nstatus: draft\n---\n",
  );
});

test("frontmatter add with afterField reports whether the field was placed", () => {
  const source = "---\ntitle: A\nstatus: draft\n---\n";
  const placed = createFrontmatterFieldPatch(source, "owner", "Ana", { afterField: "title" });
  assert.ok(placed);
  assert.equal(placed.positioned, true);
  assert.equal(
    source.slice(0, placed.start) + placed.text + source.slice(placed.end),
    "---\ntitle: A\nowner: Ana\nstatus: draft\n---\n",
  );

  const missing = createFrontmatterFieldPatch(source, "owner", "Ana", { afterField: "missing" });
  assert.ok(missing);
  assert.equal(missing.positioned, false);
  assert.equal(
    source.slice(0, missing.start) + missing.text + source.slice(missing.end),
    "---\ntitle: A\nstatus: draft\nowner: Ana\n---\n",
  );

  const plain = createFrontmatterFieldPatch(source, "owner", "Ana");
  assert.ok(plain);
  assert.equal(plain.positioned, undefined);
});

test("T22: linkSuggestions are set only for filename-stem fields and only when links are inspected", () => {
  const fsRoot = makeSyntheticFs({
    "index.md": "# Bundle\n",
    "_schema/note.schema.yaml": [
      "type: object",
      "properties:",
      "  type: { const: note }",
      "  refs:",
      "    type: array",
      "    items:",
      "      type: string",
      "      x-okf-link: { resolution: filename-stem, syntax: plain }",
      "  single:",
      "    type: string",
      "    x-okf-link: { resolution: filename-stem, syntax: plain }",
      "  attachments:",
      "    type: array",
      "    items:",
      "      type: string",
      "      x-okf-link: { resolution: bundle-relative, syntax: plain }",
      "  title: { type: string }",
      "required: [type]",
    ].join("\n"),
    "docs/source.md": "---\ntype: note\nrefs: [StRS-A]\nsingle: StRS-B\nattachments: [a.txt]\ntitle: T\n---\nBody.\n",
    "StRS-A.md": "# A\n",
    "StRS-B.md": "# B\n",
  });
  try {
    const sourcePath = path.join(fsRoot.root, "docs/source.md");
    const analyze = (inspectLinks: boolean) => analyzeFrontmatter({
      schemaFiles: nodeSchemaFiles,
      filePath: sourcePath,
      sourceText: fs.readFileSync(sourcePath, "utf8"),
      stopDir: fsRoot.root,
      bundleRoot: fsRoot.root,
      inspectLinks,
      strictAdditionalProperties: false,
      workspaceRoots: [fsRoot.root],
    });
    const on = new Map(analyze(true).fields.map((field) => [field.name, field] as const));
    assert.ok(on.get("refs")?.linkSuggestions?.includes("StRS-A"));
    assert.ok(on.get("refs")?.linkSuggestions?.includes("StRS-B"));
    assert.ok(on.get("single")?.linkSuggestions?.includes("StRS-A"));
    assert.equal(on.get("attachments")?.linkSuggestions, undefined);
    assert.equal(on.get("title")?.linkSuggestions, undefined);
    assert.equal(on.get("type")?.linkSuggestions, undefined);
    const off = analyze(false);
    assert.ok(off.fields.every((field) => field.linkSuggestions === undefined));
  } finally {
    fs.rmSync(fsRoot.root, { recursive: true, force: true });
  }
});

test("T24: analyzeFrontmatter flags schema-required fields only", () => {
  const sourceText = "---\ntype: concept\nname: x\nnote: y\n---\nBody.\n";
  const fsRoot = makeSyntheticFs({
    "_schema/concept.schema.yaml": [
      "type: object",
      "properties:",
      "  type: { type: string }",
      "  name: { type: string }",
      "  note: { type: string }",
      "required: [type, name]",
    ].join("\n"),
    "docs/D-1.md": sourceText,
  });
  try {
    const result = analyzeFrontmatter({
      schemaFiles: nodeSchemaFiles,
      filePath: path.join(fsRoot.root, "docs/D-1.md"),
      sourceText,
      stopDir: fsRoot.root,
      strictAdditionalProperties: false,
    });
    const byName = (name: string) => result.fields.find((candidate) => candidate.name === name);
    assert.equal(byName("name")?.required, true);
    assert.equal(byName("type")?.required, true);
    assert.equal(byName("note")?.required, undefined);
  } finally {
    fs.rmSync(fsRoot.root, { recursive: true, force: true });
  }
});

test("T25: additionalPropertiesAllowed is false only for a schema forbidding extra keys", () => {
  const sourceText = "---\ntype: concept\nname: x\n---\nBody.\n";
  const analyze = (schemaLines: string[] | undefined): boolean | undefined => {
    const fsRoot = makeSyntheticFs({
      ...(schemaLines ? { "_schema/concept.schema.yaml": schemaLines.join("\n") } : {}),
      "docs/D-1.md": sourceText,
    });
    try {
      return analyzeFrontmatter({
        schemaFiles: nodeSchemaFiles,
        filePath: path.join(fsRoot.root, "docs/D-1.md"),
        sourceText,
        stopDir: fsRoot.root,
        strictAdditionalProperties: false,
      }).additionalPropertiesAllowed;
    } finally {
      fs.rmSync(fsRoot.root, { recursive: true, force: true });
    }
  };
  const base = ["type: object", "properties:", "  type: { type: string }", "  name: { type: string }"];
  assert.equal(analyze([...base, "additionalProperties: false"]), false);
  assert.equal(analyze([...base, "additionalProperties: true"]), true);
  assert.equal(analyze(base), true);
  assert.equal(analyze(undefined), true);
});

test("T41: a schema field goes between its schema neighbours, whatever row was clicked", () => {
  const order = ["type", "scope", "lifecycle", "derived_by", "depends_on"];
  const keys = ["type", "scope", "lifecycle", "derived_by"];
  assert.deepEqual(frontmatterAddPlacement(keys, order, "depends_on"), { afterField: "derived_by" });
  assert.deepEqual(frontmatterAddPlacement(["type", "derived_by", "scope"], order, "lifecycle"), { afterField: "scope" });
  assert.deepEqual(frontmatterAddPlacement(["scope", "lifecycle"], order, "type"), { beforeField: "scope" });
});

test("T41: a schema field skips schema neighbours that are absent and goes before custom keys", () => {
  const order = ["type", "scope", "lifecycle"];
  assert.deepEqual(frontmatterAddPlacement(["type", "extra"], order, "lifecycle"), { afterField: "type" });
  assert.deepEqual(frontmatterAddPlacement(["extra", "other"], order, "type"), { beforeField: "extra" });
  assert.deepEqual(frontmatterAddPlacement([], order, "type"), {});
});

test("T41: a custom key goes after the last row of the table, where non-schema keys are listed", () => {
  const order = ["type", "scope", "lifecycle"];
  // The table lists schema fields first, then the other keys in source order.
  assert.deepEqual(frontmatterAddPlacement(["owner", "type", "scope", "note"], order, "reviewer"), { afterField: "note" });
  assert.deepEqual(frontmatterAddPlacement(["lifecycle", "scope", "type"], order, "reviewer"), { afterField: "lifecycle" });
  assert.deepEqual(frontmatterAddPlacement([], order, "reviewer"), {});
});

test("T41: beforeField inserts above the named field with a one-line diff", () => {
  const source = "---\nscope: Core\nstatus: draft\n---\nBody\n";
  const patch = createFrontmatterFieldPatch(source, "type", "SwRS", { beforeField: "scope" });
  assert.ok(patch);
  assert.equal(patch.positioned, true);
  assert.equal(
    source.slice(0, patch.start) + patch.text + source.slice(patch.end),
    "---\ntype: SwRS\nscope: Core\nstatus: draft\n---\nBody\n",
  );
  const middle = createFrontmatterFieldPatch(source, "type", "SwRS", { beforeField: "status" });
  assert.ok(middle);
  assert.equal(
    source.slice(0, middle.start) + middle.text + source.slice(middle.end),
    "---\nscope: Core\ntype: SwRS\nstatus: draft\n---\nBody\n",
  );
  const crlf = "---\r\nscope: Core\r\n---\r\n";
  const crlfPatch = createFrontmatterFieldPatch(crlf, "type", "SwRS", { beforeField: "scope" });
  assert.ok(crlfPatch);
  assert.equal(
    crlf.slice(0, crlfPatch.start) + crlfPatch.text + crlf.slice(crlfPatch.end),
    "---\r\ntype: SwRS\r\nscope: Core\r\n---\r\n",
  );
});

test("T41: plain scalar safety", () => {
  for (const safe of ["Ann", "two words", "a-b", "x.y"]) {
    assert.equal(isPlainSafeScalar(safe), true, safe);
  }
  assert.equal(isPlainSafeScalar("?x"), true);
  for (const unsafe of ["yes", "No", "on", "null", "~", "true", "123", "1.5", "a: b", "#x", " lead", "trail ", "", "a\nb", "- item", "[x]",
    "2026-10-13", "1_000", "0b101", "12:30", "1:20:30", "=", "<<", "a\tb", "1e3", "0x1F", ".inf", "- x", "[a]", "{a}", "*a", "&a", "!t", "%x", "@x", "`x", "'quote", '"q', "a #b", "key: v"]) {
    assert.equal(isPlainSafeScalar(unsafe), false, JSON.stringify(unsafe));
  }
});

test("T41: plainScalar writes a new custom key's text unquoted only when safe", () => {
  const edit = (value: string) => {
    const source = '---\nstatus: review\napprover: ""\npriority: 3\n---\n';
    const patch = createFrontmatterFieldPatch(source, "approver", value, { plainScalar: true });
    assert.ok(patch, value);
    return source.slice(0, patch.start) + patch.text + source.slice(patch.end);
  };
  assert.equal(edit("Ann"), "---\nstatus: review\napprover: Ann\npriority: 3\n---\n");
  assert.equal(edit("two words"), "---\nstatus: review\napprover: two words\npriority: 3\n---\n");
  for (const text of ["yes", "null", "123", "a: b", "#x", " lead"]) {
    const result = edit(text);
    const parsed = extractFrontmatter(result).frontmatter;
    assert.equal(parsed?.approver, text);
    assert.match(result, /approver: ["']/u, text);
  }
});

test("T41: without plainScalar an edited quoted value keeps its quotes", () => {
  const source = '---\napprover: ""\n---\n';
  const patch = createFrontmatterFieldPatch(source, "approver", "Ann");
  assert.ok(patch);
  assert.equal(source.slice(0, patch.start) + patch.text + source.slice(patch.end), '---\napprover: "Ann"\n---\n');
});

test("T41: plainScalar quotes a date-like value", () => {
  const source = '---\napprover: ""\n---\n';
  const patch = createFrontmatterFieldPatch(source, "approver", "2026-10-13", { plainScalar: true });
  assert.ok(patch);
  assert.equal(source.slice(0, patch.start) + patch.text + source.slice(patch.end), '---\napprover: "2026-10-13"\n---\n');
});

test("T41: beforeField on the first key inserts after leading comment lines", () => {
  const source = "---\n# header\ntitle: x\n---\n";
  const patch = createFrontmatterFieldPatch(source, "a", "", { beforeField: "title" });
  assert.ok(patch);
  assert.equal(source.slice(0, patch.start) + patch.text + source.slice(patch.end), '---\n# header\na: ""\ntitle: x\n---\n');
  const crlf = "---\r\n# header\r\ntitle: x\r\n---\r\n";
  const crlfPatch = createFrontmatterFieldPatch(crlf, "a", "", { beforeField: "title" });
  assert.ok(crlfPatch);
  assert.equal(crlf.slice(0, crlfPatch.start) + crlfPatch.text + crlf.slice(crlfPatch.end), '---\r\n# header\r\na: ""\r\ntitle: x\r\n---\r\n');
});

test("inherited Object.prototype names are not treated as present or declared fields", () => {
  const fsRoot = makeSyntheticFs({
    "_schema/note.schema.yaml": [
      "type: object",
      "properties:",
      "  type: { type: string }",
      "  constructor: { type: string }",
      "  toString: { type: string }",
      "required: [type, constructor, toString]",
    ].join("\n"),
    "docs/D.md": "---\ntype: note\n---\nBody.\n",
  });
  try {
    const result = analyzeFrontmatter({
      schemaFiles: nodeSchemaFiles,
      filePath: path.join(fsRoot.root, "docs/D.md"),
      sourceText: "---\ntype: note\n---\nBody.\n",
      stopDir: fsRoot.root,
      strictAdditionalProperties: false,
    });
    assert.deepEqual(result.missingRequiredFields, ["constructor", "toString"]);
    for (const name of ["constructor", "toString"]) {
      assert.ok(result.fields.find((field) => field.name === name)?.issues.some(
        (issue) => issue.severity === "error",
      ));
    }
    assert.equal(Object.hasOwn(effectiveProperties({ properties: { a: {} } }).properties, "toString"), false);
  } finally {
    fs.rmSync(fsRoot.root, { recursive: true, force: true });
  }
});

test("frontmatter patches stay minimal when the block holds a recursive alias", () => {
  const source = "---\ntitle: a\nloop: &x\n  self: *x\nother: [1,2]\n---\nbody\n";
  const apply = (patch: { start: number; end: number; text: string } | undefined): string => {
    assert.ok(patch);
    return source.slice(0, patch.start) + patch.text + source.slice(patch.end);
  };

  assert.deepEqual(createFrontmatterFieldPatch(source, "title", "b"), { start: 4, end: 12, text: "title: b" });
  assert.equal(apply(createFrontmatterFieldPatch(source, "new", "v")),
    "---\ntitle: a\nloop: &x\n  self: *x\nother: [1,2]\nnew: v\n---\nbody\n");
  assert.equal(apply(createFrontmatterFieldRemovePatch(source, "title")),
    "---\nloop: &x\n  self: *x\nother: [1,2]\n---\nbody\n");
  assert.equal(apply(createFrontmatterFieldRenamePatch(source, "title", "t2")),
    "---\nt2: a\nloop: &x\n  self: *x\nother: [1,2]\n---\nbody\n");
});
