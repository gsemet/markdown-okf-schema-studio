import * as assert from "node:assert/strict";
import { test } from "node:test";

import { citedIds, parseMainPaths } from "./mainPaths";

/** The section of StRS-MDOKFSTUDIO-DIAG-001, the sample of the format. */
const DIAG_001 = `## A diagram is drawn

### Main paths

#### Path 1: Insert a diagram, break it, fix it

1. Edit mode is on with the GFM palette
   - SwRS-MDOKFSTUDIO-DIAG-017: the writer clicks Mermaid in the palette
   - Option SwRS-MDOKFSTUDIO-DIAG-017 (refusal): the Strict or MyST palette offers no Mermaid
2. A starter fence is in the document
   - SwRS-MDOKFSTUDIO-DIAG-001: the page renders the fence
   - Option SwRS-MDOKFSTUDIO-DIAG-001 (boundary): an empty fence is left blank
3. The diagram is drawn as a picture
   - SwRS-MDOKFSTUDIO-DIAG-127: a click on the picture opens its source
   - Option SwRS-MDOKFSTUDIO-DIAG-009: text typed elsewhere keeps the drawing
4. The source editor is open
   - SwRS-MDOKFSTUDIO-DIAG-015: an invalid line is saved
5. A parser message shows, the source stays
   - SwRS-MDOKFSTUDIO-DIAG-001: the writer fixes the source
6. The diagram is drawn again in the theme colours

#### Path 2: Switch the theme

1. The diagram is drawn as a picture
   - SwRS-MDOKFSTUDIO-DIAG-005: the reader changes the theme
   - Option SwRS-MDOKFSTUDIO-DIAG-005 (boundary): the colours stay the same, nothing is redrawn
2. The diagram is redrawn in the new theme, labels kept

<!-- okf:links:start -->
### Links

- SwRS-MDOKFSTUDIO-DIAG-999: not part of the section
`;

test("the Main paths section is read into paths, states, steps and options", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-081
  const paths = parseMainPaths(DIAG_001);
  assert.equal(paths.length, 2);
  assert.equal(paths[0]?.title, "Insert a diagram, break it, fix it");
  assert.equal(paths[0]?.steps.length, 6);
  assert.equal(paths[1]?.steps.length, 2);
  const shared = "The diagram is drawn as a picture";
  assert.equal(paths[0]?.steps[2]?.state, shared);
  assert.equal(paths[1]?.steps[0]?.state, shared, "the same words name the same state in both paths");
  assert.equal(paths[0]?.steps[0]?.via?.id, "SwRS-MDOKFSTUDIO-DIAG-017");
  assert.equal(paths[0]?.steps[0]?.via?.label, "the writer clicks Mermaid in the palette");
  assert.deepEqual(paths[0]?.steps[0]?.options.map((option) => option.kind), ["refusal"]);
  assert.deepEqual(paths[0]?.steps[1]?.options.map((option) => option.kind), ["boundary"]);
  assert.deepEqual(paths[0]?.steps[2]?.options.map((option) => [option.id, option.kind]), [["SwRS-MDOKFSTUDIO-DIAG-009", undefined]]);
  assert.equal(paths[0]?.steps[5]?.via, undefined, "the last state has no step");
  assert.deepEqual(citedIds(paths), [
    "SwRS-MDOKFSTUDIO-DIAG-017", "SwRS-MDOKFSTUDIO-DIAG-001", "SwRS-MDOKFSTUDIO-DIAG-127",
    "SwRS-MDOKFSTUDIO-DIAG-009", "SwRS-MDOKFSTUDIO-DIAG-015", "SwRS-MDOKFSTUDIO-DIAG-005",
  ]);
});

test("a StRS without the section gives no path and an unknown id is kept as cited", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-081
  assert.deepEqual(parseMainPaths("## T\n\n### Rationale\n\ntext\n"), []);
  assert.deepEqual(parseMainPaths(""), []);
  assert.deepEqual(parseMainPaths("### Main paths\n\nnothing yet\n"), []);
  const paths = parseMainPaths("### Main paths\n\n#### Path 1: x\n\n1. A\n   - SwRS-UNKNOWN-999: moves\n2. B\n");
  assert.deepEqual(citedIds(paths), ["SwRS-UNKNOWN-999"], "the parser does not check that the id exists");
});
