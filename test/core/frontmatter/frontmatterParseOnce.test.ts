import * as assert from "node:assert/strict";
import { mock, test } from "node:test";

import { analyzeFrontmatter } from "../../../src/core/frontmatter/okfFrontmatter";
import { renderMyst } from "../../../src/core/render/mystRenderer";
import { nodeSchemaFiles } from "../../../src/node-services/schemaFiles";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const yaml = require("yaml") as typeof import("yaml");

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-001
test("a document's frontmatter is parsed once for the render and every analysis of that text", async () => {
  const source = "---\ntitle: Parsed once\ntags: [a, b]\n---\n\n# Body\n";
  const parse = mock.method(yaml, "parseDocument");
  try {
    await renderMyst(source);
    for (let pass = 0; pass < 3; pass += 1) {
      const result = analyzeFrontmatter({
        schemaFiles: nodeSchemaFiles,
        filePath: "/nonexistent/once.md",
        sourceText: source,
        allowSchemaResolution: false,
        strictAdditionalProperties: false,
      });
      assert.equal(result.present, true);
    }
    assert.equal(parse.mock.callCount(), 1);
  } finally {
    parse.mock.restore();
  }
});
