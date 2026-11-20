import * as assert from "node:assert/strict";
import { test } from "node:test";

import { renderMyst } from "../../../src/core/render/mystRenderer";
import { moveListItem } from "../../../src/page/modules/listItemMove";

/**
 * The move of a list item on the list's source (modules/listItemMove.ts).
 */

const lines = (...text: string[]): string => text.join("\n");

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-262
test("a bullet item moves first to last, last to first and in the middle, for each bullet marker", () => {
  for (const bullet of ["-", "*", "+"]) {
    const source = lines(`${bullet} a`, `${bullet} b`, `${bullet} c`, "");
    assert.equal(moveListItem(source, 3, 0, 2), lines(`${bullet} b`, `${bullet} c`, `${bullet} a`, ""), bullet);
    assert.equal(moveListItem(source, 3, 2, 0), lines(`${bullet} c`, `${bullet} a`, `${bullet} b`, ""), bullet);
    assert.equal(moveListItem(source, 3, 1, 2), lines(`${bullet} a`, `${bullet} c`, `${bullet} b`, ""), bullet);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-262
test("task items move with their checkbox text unchanged", () => {
  const source = lines("- [ ] write", "- [x] read", "- [ ] sleep", "");
  assert.equal(moveListItem(source, 3, 1, 0), lines("- [x] read", "- [ ] write", "- [ ] sleep", ""));
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-262
test("an item with a nested list, a fenced block and a blank line inside moves whole", () => {
  const source = lines(
    "- one",
    "  - one a",
    "  - one b",
    "",
    "  ```text",
    "  code",
    "",
    "  more code",
    "  ```",
    "- two",
    "- three",
    "",
  );
  assert.equal(moveListItem(source, 3, 0, 2), lines(
    "- two",
    "- three",
    "- one",
    "  - one a",
    "  - one b",
    "",
    "  ```text",
    "  code",
    "",
    "  more code",
    "  ```",
    "",
  ));
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-262
test("a tight list stays tight and a loose list keeps its gaps in place", () => {
  assert.equal(moveListItem(lines("- a", "- b", "- c", ""), 3, 2, 0), lines("- c", "- a", "- b", ""));
  const loose = lines("- a", "", "- b", "", "- c", "");
  assert.equal(moveListItem(loose, 3, 2, 0), lines("- c", "", "- a", "", "- b", ""));
  assert.equal(moveListItem(loose, 3, 0, 2), lines("- b", "", "- c", "", "- a", ""));
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-262
test("a trailing blank line or blank quote line after the last item stays at the end", () => {
  assert.equal(moveListItem(lines("- a", "- b", "- c", "", ""), 3, 2, 0), lines("- c", "- a", "- b", "", ""));
  assert.equal(moveListItem(lines("> - a", "> - b", ">", ""), 2, 1, 0), lines("> - b", "> - a", ">", ""));
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-262
test("an ordered list keeps its numbers in order from its first number and each item its delimiter", () => {
  assert.equal(moveListItem(lines("3. a", "4. b", "5. c", ""), 3, 0, 2), lines("3. b", "4. c", "5. a", ""));
  assert.equal(moveListItem(lines("1) a", "2) b", ""), 2, 1, 0), lines("1) b", "2) a", ""));
  assert.equal(moveListItem(lines("1. a", "1. b", "1. c", ""), 3, 2, 0), lines("1. c", "1. a", "1. b", ""),
    "a list whose items all carry the same number keeps it");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-262
test("a marker that grows from 9. to 10. indents the item's continuation lines; the nesting stays", async () => {
  const source = lines(
    "8. eight",
    "9. nine",
    "   - nine a",
    "",
    "   nine more",
    "10. ten",
    "",
  );
  const moved = moveListItem(source, 3, 1, 2);
  assert.equal(moved, lines(
    "8. eight",
    "9.  ten",
    "10. nine",
    "    - nine a",
    "",
    "    nine more",
    "",
  ), "10. widens the column of its item; 9. written with one space keeps its content column");
  // The renderer reads the same nesting: the sub-list and the paragraph stay in the moved item.
  const rendered = (await renderMyst(moved!)).html;
  assert.match(rendered, /<ol[^>]*start="8"/u);
  // The markup without its attributes and spaces.
  const html = rendered.replace(/\s[\w-]+="[^"]*"/gu, "").replace(/\s+/gu, "");
  assert.match(html, /<li><p>nine<\/p><ul><li><p>ninea<\/p><\/li><\/ul><p>ninemore<\/p><\/li><\/ol>/u);
  assert.equal(moveListItem(lines("9. a", "10. b", ""), 2, 1, 0), lines("9.  b", "10. a", ""));
  // A shorter marker written with one space after it keeps its content column.
  assert.equal(moveListItem(lines("9. a", "10. b", "    b more", ""), 2, 1, 0),
    lines("9.  b", "    b more", "10. a", ""));
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-262
test("a list in a quote keeps its prefix on every line, blank quote lines included", () => {
  assert.equal(moveListItem(lines("> - a", ">", "> - b", ">   - b1", "> - c", ""), 3, 0, 2),
    lines("> - b", ">   - b1", ">", "> - c", "> - a", ""));
  assert.equal(moveListItem(lines("> > 1. a", "> >", "> > 2. b", ""), 2, 1, 0),
    lines("> > 1. b", "> >", "> > 2. a", ""));
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-262
test("CRLF line endings and a source without a final line break are kept", () => {
  assert.equal(moveListItem("- a\r\n- b\r\n- c\r\n", 3, 0, 2), "- b\r\n- c\r\n- a\r\n");
  assert.equal(moveListItem("- a\n- b", 2, 1, 0), "- b\n- a");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-262
test("a source that does not read as the rendered items, or a move out of range, is refused", () => {
  const source = lines("- a", "- b", "- c", "");
  assert.equal(moveListItem(source, 2, 0, 1), undefined, "a count mismatch");
  assert.equal(moveListItem(lines("Intro", "- a", "- b", ""), 2, 0, 1), undefined, "text before the first item");
  assert.equal(moveListItem(lines("  - a", "  - b", "c", ""), 2, 0, 1), undefined, "a line with less indentation");
  assert.equal(moveListItem(lines("> - a", "- b", ""), 2, 0, 1), undefined, "mixed prefixes");
  assert.equal(moveListItem(lines("> - a", "> > - b", ""), 2, 0, 1), undefined, "mixed prefixes");
  assert.equal(moveListItem(source, 3, 1, 1), undefined, "from === to");
  assert.equal(moveListItem(source, 3, 0, 3), undefined, "an index out of range");
  assert.equal(moveListItem(source, 3, -1, 0), undefined, "an index out of range");
  assert.equal(moveListItem("", 0, 0, 1), undefined, "an empty source");
});
