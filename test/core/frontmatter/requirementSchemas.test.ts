import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { parse } from "yaml";

import { getCachedValidator } from "../../../src/core/frontmatter/schemaValidator";

// Guards the strict requirement schemas of this repo (CR 122): an unknown frontmatter key must be
// a validation error. REQUIREMENT_SCHEMA_DIR lets a reviewer point the test at other schemas.
const root = process.cwd();
const schemaDir =
  process.env.REQUIREMENT_SCHEMA_DIR ?? path.join(root, "requirements/tiers/_schema");

function loadSchema(name: string): Record<string, unknown> {
  return parse(fs.readFileSync(path.join(schemaDir, `${name}.schema.yaml`), "utf8"));
}

// The extension resolves `$ref: base.schema.yaml` through the registry; inline the base here.
function tierSchema(name: "strs" | "swrs"): object {
  const base = loadSchema("base");
  const tier = loadSchema(name);
  const text = JSON.stringify(tier).replaceAll('"base.schema.yaml"', '"#/$defs/base"');
  const resolved = JSON.parse(text) as Record<string, unknown>;
  resolved.$defs = { base };
  delete base.$schema;
  delete base.$id;
  delete resolved.$id;
  return resolved;
}

function frontmatter(file: string): Record<string, unknown> {
  const text = fs.readFileSync(path.join(root, "requirements/tiers", file), "utf8");
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text);
  assert.ok(match, `${file} has frontmatter`);
  return parse(match[1]) as Record<string, unknown>;
}

const samples = [
  ["strs", "strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-001.md"],
  ["swrs", "swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-001.md"],
] as const;

for (const [tier, file] of samples) {
  test(`requirement schema ${tier}: accepts a real requirement and rejects an unknown key`, () => {
    const validate = getCachedValidator(tierSchema(tier));
    const valid = frontmatter(file);
    assert.equal(validate(valid), true, JSON.stringify(validate.errors));

    assert.equal(validate({ ...valid, relates_to: ["SwRS-MDOKFSTUDIO-BLOCK-012"] }), true);
    assert.equal(validate({ ...valid, bogus_key: 1 }), false);
    assert.ok(
      validate.errors?.some((e) => e.keyword === "unevaluatedProperties"),
      JSON.stringify(validate.errors),
    );
    assert.equal(validate({ ...valid, superseded_by: "SwRS-MDOKFSTUDIO-BLOCK-012" }), false);
  });
}
