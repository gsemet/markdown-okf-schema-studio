/**
 * Requirement tests of the frontmatter schema scope: the not-a-mapping row, the unparsable schema
 * row, the refusal of absolute and escaping link targets, the 64-schema registry cap and the
 * info count of the title badge. Each test asserts the behaviour of the current code.
 */
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, test } from "node:test";

import { inspectFrontmatterLinks } from "../../../src/core/frontmatter/fileLinks";
import {
  analyzeFrontmatter,
  extractFrontmatter,
  type FrontmatterResult,
} from "../../../src/core/frontmatter/okfFrontmatter";
import { linkStatusLabel, renderPropertiesTable } from "../../../src/core/frontmatter/propertiesTable";
import { getResolvedSchema, resetSchemaRegistryForTests } from "../../../src/core/frontmatter/schemaRegistry";
import { nodeSchemaFiles } from "../../../src/node-services/schemaFiles";

const roots: string[] = [];

function temporaryRoot(): string {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "diag-req-fm-")));
  roots.push(root);
  return root;
}

afterEach(() => {
  resetSchemaRegistryForTests();
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function analyze(root: string, sourceText: string): FrontmatterResult {
  return analyzeFrontmatter({
    schemaFiles: nodeSchemaFiles,
    filePath: path.join(root, "doc.md"),
    sourceText,
    stopDir: root,
    inspectLinks: false,
    strictAdditionalProperties: false,
    workspaceRoots: [root],
  });
}

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-001
test("frontmatter that is a list or an empty block gives the not-a-mapping error row and one error", () => {
  const root = temporaryRoot();
  for (const source of ["---\n- a\n- b\n---\n\nBody.\n", "---\n---\n\nBody.\n"]) {
    const extraction = extractFrontmatter(source);
    assert.equal(extraction.present, true);
    assert.equal(extraction.frontmatter, undefined);
    assert.equal(extraction.error, "Frontmatter is not a mapping.");

    const result = analyze(root, source);
    assert.deepEqual(result.info, [{ severity: "error", message: "Invalid frontmatter YAML: Frontmatter is not a mapping." }]);
    assert.deepEqual(result.summary, { errors: 1, warnings: 0, infos: 0 });
    const markup = renderPropertiesTable(result, true);
    assert.match(markup, /data-okf-errors="1"[^>]*>✖ 1<\/button>/u);
    assert.match(markup, /Invalid frontmatter YAML: Frontmatter is not a mapping\./u);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-023
test("a JSON5 schema that cannot be parsed gives the generic table and one warning row; a YAML error is not reported as such", () => {
  const root = temporaryRoot();
  fs.mkdirSync(path.join(root, "_schema"));
  fs.writeFileSync(path.join(root, "_schema", "Note.schema.json5"), "{ type: 'object', properties: ");
  const source = "---\ntype: Note\ntitle: Hello\n---\n";

  const result = analyze(root, source);
  assert.equal(result.schemaFound, false);
  assert.equal(result.info.length, 1);
  assert.equal(result.info[0]!.severity, "warning");
  assert.match(result.info[0]!.message, /^Schema could not be parsed: /u);
  assert.deepEqual(result.summary, { errors: 0, warnings: 1, infos: 0 });
  assert.deepEqual(result.fields.map((field) => field.name), ["type", "title"], "the fields are listed in source order");
  assert.match(renderPropertiesTable(result, true), /data-okf-warnings="1"/u);

  // Known issue: a YAML syntax error of the schema is not reported as a parse failure.
  const yamlRoot = temporaryRoot();
  fs.mkdirSync(path.join(yamlRoot, "_schema"));
  fs.writeFileSync(path.join(yamlRoot, "_schema", "Note.schema.yaml"), "type: [a\n");
  const yaml = analyze(yamlRoot, source);
  const messages = [...yaml.info.map((entry) => entry.message), ...yaml.fields.flatMap((field) => field.issues.map((issue) => issue.message))];
  assert.equal(messages.some((message) => message.startsWith("Schema could not be parsed")), false);
});

const LINK = { resolution: "bundle-relative", syntax: "plain" };
const linkSchema = (annotation: Record<string, unknown> = LINK): Record<string, unknown> => ({
  type: "object",
  properties: { ref: { type: "string", "x-okf-link": annotation } },
});

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-050
test("an absolute link target is refused with an E10 error in POSIX, drive-letter and UNC form", () => {
  const root = temporaryRoot();
  for (const resolution of ["document-relative", "bundle-relative", "project-relative"]) {
    for (const target of ["/etc/hosts", "C:/x.md", "C:\\x.md", "\\\\server\\share\\x.md"]) {
      const [link] = inspectFrontmatterLinks({ ref: target }, linkSchema({ resolution, syntax: "plain" }), {
        filePath: path.join(root, "doc.md"),
        bundleRoot: root,
        projectRoot: root,
        workspaceRoots: [root],
      });
      assert.equal(link?.code, "E10", `${resolution} ${target}`);
      assert.equal(link?.message, `absolute target '${target}' is not allowed at 'ref'`);
      assert.equal(linkStatusLabel(link!), "Absolute paths are not allowed");
    }
  }
});

test("a bundle-relative target cannot leave its root, by path or through a symbolic link", () => {
  const root = temporaryRoot();
  const bundle = path.join(root, "bundle");
  fs.mkdirSync(path.join(bundle, "docs"), { recursive: true });
  fs.writeFileSync(path.join(root, "outside.md"), "# Outside\n");
  fs.symlinkSync(path.join(root, "outside.md"), path.join(bundle, "link.md"));
  const inspect = (target: string) => inspectFrontmatterLinks({ ref: target }, linkSchema(), {
    filePath: path.join(bundle, "docs", "doc.md"),
    bundleRoot: bundle,
    workspaceRoots: [root],
  })[0]!;

  const traversal = inspect("../outside.md");
  assert.equal(traversal.code, "E10");
  assert.equal(traversal.message, "target '../outside.md' escapes its bundle-relative root at 'ref'");
  assert.equal(linkStatusLabel(traversal), "Outside the allowed folder");

  const symbolic = inspect("link.md");
  assert.equal(symbolic.code, "E10");
  assert.equal(symbolic.message, "target 'link.md' escapes its bundle-relative root at 'ref'");
});

test("the registry keeps 64 resolved schemas and drops the oldest at the 65th", () => {
  const builds = new Map<string, number>();
  const resolve = (name: string): Record<string, unknown> => getResolvedSchema(name, () => {
    builds.set(name, (builds.get(name) ?? 0) + 1);
    return { title: name };
  });

  for (let index = 0; index < 64; index += 1) resolve(`schema-${index}`);
  resolve("schema-0");
  assert.equal(builds.get("schema-0"), 1, "within the limit the schema is served from the cache");

  resolve("schema-64");
  resolve("schema-1");
  assert.equal(builds.get("schema-1"), 1, "the second schema is still cached");
  resolve("schema-0");
  assert.equal(builds.get("schema-0"), 2, "the oldest schema by insertion was dropped, whatever its later hits, and is read again");
});

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-039
test("the title badge counts infos only when there is no error and no warning", () => {
  const result = (summary: FrontmatterResult["summary"]): FrontmatterResult => ({
    present: true,
    fields: [],
    orderMode: "yaml",
    schemaFound: false,
    missingRequiredFields: [],
    info: [],
    summary,
  });
  const badge = (summary: FrontmatterResult["summary"]): string =>
    /<button[^>]*data-okf-badge[^>]*>([^<]*)<\/button>/u.exec(renderPropertiesTable(result(summary), true))![1]!;

  assert.equal(badge({ errors: 0, warnings: 0, infos: 1 }), "ℹ 1");
  assert.equal(badge({ errors: 1, warnings: 0, infos: 1 }), "✖ 1");
  assert.equal(badge({ errors: 0, warnings: 2, infos: 3 }), "⚠ 2");
  assert.doesNotMatch(renderPropertiesTable(result({ errors: 0, warnings: 0, infos: 0 }), true), /data-okf-badge/u);
});
