import { test } from "node:test";

import { assertCopy, at } from "./rawCopyBalanceSupport";

const NESTED = ["- parent", "  - child **world**", "  - sibling", "- next", ""].join("\n");

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-283
test("a nested list crossed at the start keeps the start item's marker and the shift is the shallowest copied marker", async () => {
  await assertCopy(
    NESTED,
    at("world", 2),
    at("next", "end"),
    "rld**\n  - sibling\n- next",
    "  - **rld**\n  - sibling\n- next",
  );
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-283
test("a nested list with the end in the same parent item is shifted by the parent's content column", async () => {
  await assertCopy(
    NESTED,
    at("world", 2),
    at("sibling", "end"),
    "rld**\n  - sibling",
    "- **rld**\n- sibling",
  );
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-283
test("both edges in one list item copy its content without the marker or the indentation", async () => {
  const source = ["- first para", "", "  second para", "- next", ""].join("\n");
  await assertCopy(source, at("first para", 6), at("second para", 6), "para\n\n  second", "para\n\nsecond");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-283
test("the start item deeper than column 3 is moved to column 3, the other lines keep the shift", async () => {
  const source = ["- aaa", "  - bbb", "    - ccc", "      - delta deep", "- echo", ""].join("\n");
  await assertCopy(
    source,
    at("delta deep", 6),
    at("echo", 3),
    "deep\n- ech",
    "   - deep\n- ech",
  );
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-283
test("an ordered list keeps its own number and a task item its box", async () => {
  const ordered = ["3. alpha", "4. bravo word", "5. charlie", ""].join("\n");
  await assertCopy(ordered, at("bravo word", 6), at("charlie", 3), "word\n5. cha", "4. word\n5. cha");
  const tasks = ["- [x] done thing", "- [ ] other", ""].join("\n");
  await assertCopy(tasks, at("thing", 1), at("other", 3), "hing\n- [ ] oth", "- [x] hing\n- [ ] oth");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-283
test("a list in a blockquote: the shift is counted after the quote prefix", async () => {
  const source = ["> - alpha", ">   - bravo word", "> - charlie", "", "after", ""].join("\n");
  await assertCopy(
    source,
    at("bravo word", 6),
    at("after", 3),
    "word\n> - charlie\n\naft",
    ">   - word\n> - charlie\n\naft",
  );
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-283
test("a list in an admonition, start in the second item: the opening line and the marker at column 0", async () => {
  const source = [":::{note}", "- item one", "- item two", ":::", "", "After.", ""].join("\n");
  await assertCopy(
    source,
    at("item two", 5),
    at("After.", 3),
    "two\n:::\n\nAft",
    ":::{note}\n- two\n:::\n\nAft",
  );
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-283
test("an admonition in a list item, start in its paragraph, end in the next item", async () => {
  const source = ["- item", "", "  :::{note}", "  Note body text.", "  :::", "", "- next", ""].join("\n");
  await assertCopy(
    source,
    at("Note body text.", 5),
    at("next", 2),
    "body text.\n  :::\n\n- ne",
    "- :::{note}\n  body text.\n  :::\n\n- ne",
  );
});
