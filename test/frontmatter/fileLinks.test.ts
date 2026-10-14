import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import {
  inspectFrontmatterLinks,
  resolveFrontmatterLinkRoots,
} from "../../src/frontmatter/fileLinks";

const linkAnnotation = {
  resolution: "document-relative",
  syntax: "plain",
};

function inspect(frontmatter: Record<string, unknown>, schema: Record<string, unknown>) {
  return inspectFrontmatterLinks(frontmatter, schema, {
    filePath: "/workspace/document.md",
    resolveTargets: false,
  });
}

test("link annotations read target fields and exact marker lines afresh", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "okf-link-details-"));
  const target = path.join(root, "target.md");
  const schema = { properties: { target: { "x-okf-link": {
    ...linkAnnotation,
    tooltip_shows_fields: ["description", "missing"],
    preview_shows_fields: ["description"],
    show_line_number: true,
    basename_marker: "@tests_req",
    id_marker: "id",
  } } } };
  try {
    fs.writeFileSync(target, "---\ndescription: 'The <tool> SHALL work.'\n---\n@tests_req REQ-10\n@tests_req REQ-1\n");
    const read = () => inspectFrontmatterLinks({ id: "REQ-1", target: "target.md" }, schema, {
      filePath: path.join(root, "REQ-1.md"), workspaceRoots: [root],
    })[0];
    assert.deepEqual(read().tooltipFields, { description: "The <tool> SHALL work." });
    assert.deepEqual(read().previewFields, { description: "The <tool> SHALL work." });
    assert.equal(read().markerLine, 5);
    fs.writeFileSync(target, "---\ndescription: Updated\n---\n");
    assert.deepEqual(read().previewFields, { description: "Updated" });
    assert.equal(read().markerLine, undefined);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("link display options reject invalid metadata", () => {
  for (const annotation of [
    { tooltip_shows_fields: "description" },
    { preview_shows_fields: [42] },
    { show_line_number: "true" },
  ]) {
    const results = inspect({ target: "target.md" }, {
      properties: { target: { "x-okf-link": { ...linkAnnotation, ...annotation } } },
    });
    assert.equal(results[0].code, "E10");
  }
});

test("oneOf annotations are collected only when exactly one branch matches", () => {
  const schema: Record<string, unknown> = {
    type: "object",
    properties: {
      target: {
        oneOf: [
          { type: "string", "x-okf-link": linkAnnotation },
          { const: "same", "x-okf-link": linkAnnotation },
        ],
      },
    },
  };

  const ambiguous = inspect({ target: "same" }, schema);
  assert.deepEqual(ambiguous, []);

  const unique = inspect({ target: "other" }, schema);
  assert.equal(unique.length, 1);
  assert.equal(unique[0].fieldPath, "target");
  assert.equal(unique[0].status, "pending");
});

test("conditional, patternProperties, and additionalProperties schemas are traversed", () => {
  const schema: Record<string, unknown> = {
    type: "object",
    properties: {
      kind: { type: "string" },
      metadata: {
        type: "object",
        properties: {
          declared: { type: "string" },
        },
        patternProperties: {
          "^pattern_": { type: "string", "x-okf-link": linkAnnotation },
        },
        additionalProperties: { type: "string", "x-okf-link": linkAnnotation },
      },
    },
    if: {
      properties: { kind: { const: "special" } },
      required: ["kind"],
    },
    then: {
      properties: {
        specialTarget: { type: "string", "x-okf-link": linkAnnotation },
      },
    },
    else: {
      properties: {
        ordinaryTarget: { type: "string", "x-okf-link": linkAnnotation },
      },
    },
  };

  const special = inspect({
    kind: "special",
    specialTarget: "special.md",
    ordinaryTarget: "ordinary.md",
    metadata: {
      declared: "declared.md",
      pattern_target: "pattern.md",
      extra: "extra.md",
    },
  }, schema);
  assert.deepEqual(
    special.map((link) => link.fieldPath).sort(),
    ["metadata.extra", "metadata.pattern_target", "specialTarget"],
  );

  const ordinary = inspect({
    kind: "ordinary",
    specialTarget: "special.md",
    ordinaryTarget: "ordinary.md",
    metadata: {
      pattern_target: "pattern.md",
      extra: "extra.md",
    },
  }, schema);
  assert.deepEqual(
    ordinary.map((link) => link.fieldPath).sort(),
    ["metadata.extra", "metadata.pattern_target", "ordinaryTarget"],
  );
});

test("document-relative links stay inside workspace roots unless explicitly allowed", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "okf-link-containment-"));
  const workspace = path.join(root, "workspace");
  const source = path.join(workspace, "docs", "active.md");
  const outside = path.join(root, "outside", "target.md");
  fs.mkdirSync(path.dirname(source), { recursive: true });
  fs.mkdirSync(path.dirname(outside), { recursive: true });
  fs.writeFileSync(source, "# Active\n", "utf8");
  fs.writeFileSync(outside, "# Outside\n", "utf8");
  const schema = {
    type: "object",
    properties: {
      target: { type: "string", "x-okf-link": linkAnnotation },
    },
  } as Record<string, unknown>;
  try {
    const blocked = inspectFrontmatterLinks(
      { target: "../../outside/target.md" },
      schema,
      { filePath: source, workspaceRoots: [workspace] },
    )[0];
    assert.equal(blocked?.code, "E10");
    assert.match(blocked?.message ?? "", /navigation root/u);

    const allowed = inspectFrontmatterLinks(
      { target: "../../outside/target.md" },
      schema,
      { filePath: source, workspaceRoots: [workspace], allowOutsideWorkspaceLinks: true },
    )[0];
    assert.equal(allowed?.status, "valid");
    assert.equal(allowed?.resolvedPath, fs.realpathSync(outside));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("auto-detected git roots outside the workspace are ignored", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "okf-link-project-root-"));
  const workspace = path.join(root, "workspace");
  const source = path.join(workspace, "active.md");
  const projectTarget = path.join(root, "project-target.md");
  fs.mkdirSync(path.join(root, ".git"), { recursive: true });
  fs.mkdirSync(workspace, { recursive: true });
  fs.writeFileSync(source, "# Active\n", "utf8");
  fs.writeFileSync(projectTarget, "# Project target\n", "utf8");
  try {
    const roots = resolveFrontmatterLinkRoots({
      filePath: source,
      workspaceRoots: [workspace],
    });
    assert.equal(roots.projectRoot, undefined);

    const explicit = resolveFrontmatterLinkRoots({
      filePath: source,
      projectRoot: root,
      workspaceRoots: [workspace],
    });
    assert.equal(explicit.projectRoot, fs.realpathSync(root));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
