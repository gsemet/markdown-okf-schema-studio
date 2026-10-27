import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createDocumentIndex } from "../../../src/core/comments/anchoring";
import { documentTargets } from "../../../src/core/mapping/mystTargets";
import { markdownFragmentRange } from "../../../src/core/navigation/previewNavigation";
import { expandGithubAlerts } from "../../../src/core/render/mystGithubAlerts";
import { firstHeading } from "../../../src/core/render/mystGridToctree";
import { advanceFence, escapeHtml, escapeRegExp, frontmatterRange } from "../../../src/core/syntax/markdownSyntax";

/** A consumer says whether a probe line placed between `before` and `after` is seen as content. */
interface Consumer {
  name: string;
  /** Front matter is skipped by this consumer (the others read the whole text). */
  skipsFrontmatter: boolean;
  seen(before: string, after: string): boolean;
}

const doc = (before: string, probe: string, after: string): string =>
  [before, probe, after].filter((part) => part !== "").join("\n");

const CONSUMERS: Consumer[] = [
  {
    name: "comment anchoring",
    skipsFrontmatter: true,
    seen: (before, after) => createDocumentIndex(doc(before, "Needle words", after)).plain.includes("Needle words"),
  },
  {
    name: "navigation",
    skipsFrontmatter: false,
    seen: (before, after) => markdownFragmentRange(doc(before, "(needle)=", after), "#needle") !== undefined,
  },
  {
    name: "label targets",
    skipsFrontmatter: false,
    seen: (before, after) => documentTargets(doc(before, "(needle)=", after)).items.length === 1,
  },
  {
    name: "rendering (alerts)",
    skipsFrontmatter: false,
    seen: (before, after) => expandGithubAlerts(doc(before, "> [!NOTE]\n> body", after)).includes(":::{note}"),
  },
  {
    name: "rendering (first heading)",
    skipsFrontmatter: true,
    seen: (before, after) => firstHeading(doc(before, "# Needle", after)) === "Needle",
  },
];

// @tests_req SwRS-MDOKFSTUDIO-MYST-097
test("every consumer reads code fences the same way", () => {
  const FENCES: Array<{ name: string; before: string; after?: string; seen: boolean }> = [
    { name: "open backtick fence hides the rest", before: "```\ncode", seen: false },
    { name: "open tilde fence hides the rest", before: "~~~\ncode", seen: false },
    { name: "closed fence shows what follows", before: "```\ncode\n```", seen: true },
    { name: "fence indented by three spaces opens", before: "   ```\ncode", seen: false },
    { name: "four spaces of indent is not a fence", before: "    ```\ncode", seen: true },
    { name: "a closing fence with an info string does not close", before: "```\ncode\n```js", seen: false },
    { name: "a shorter closing fence does not close", before: "````\ncode\n```", seen: false },
    { name: "another mark does not close", before: "```\ncode\n~~~", seen: false },
    { name: "a longer closing fence closes", before: "```\ncode\n`````", seen: true },
    { name: "trailing spaces on the closing fence", before: "```\ncode\n```  ", seen: true },
    { name: "a closing fence indented by four spaces does not close", before: "```\ncode\n    ```", seen: false },
  ];
  for (const consumer of CONSUMERS) {
    for (const entry of FENCES) {
      assert.equal(consumer.seen(entry.before, entry.after ?? ""), entry.seen, `${consumer.name}: ${entry.name}`);
    }
  }
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-097
test("every consumer reads front matter the same way", () => {
  const FRONT: Array<{ name: string; before: string; after: string; seen: boolean }> = [
    { name: "content inside closed front matter is skipped", before: "---\ntitle: x", after: "---", seen: false },
    { name: "the ... end marker closes too", before: "---\ntitle: x", after: "...", seen: false },
    { name: "an end marker with trailing spaces closes", before: "---\ntitle: x", after: "---  ", seen: false },
    { name: "an unclosed block is ordinary text", before: "---\ntitle: x", after: "", seen: true },
    { name: "an indented opening marker is not front matter", before: "  ---", after: "---", seen: true },
    { name: "an indented end marker does not close", before: "---\ntitle: x", after: "  ---", seen: true },
  ];
  for (const consumer of CONSUMERS.filter((one) => one.skipsFrontmatter)) {
    for (const entry of FRONT) {
      // Hidden means: the probe sits inside the front matter, so it is not content.
      assert.equal(consumer.seen(entry.before, entry.after), entry.seen, `${consumer.name}: ${entry.name}`);
    }
  }
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-097
test("frontmatterRange returns the lines taken by the front matter", () => {
  assert.equal(frontmatterRange(["---", "a: 1", "---", "text"]), 3);
  assert.equal(frontmatterRange(["---", "a: 1", "...", "text"]), 3);
  assert.equal(frontmatterRange(["---", "a: 1"]), 0);
  assert.equal(frontmatterRange(["text", "---", "a", "---"]), 0);
  assert.equal(frontmatterRange([]), 0);
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-097
test("advanceFence tracks one fence at a time, with colon fences on request", () => {
  assert.equal(advanceFence("```ts", undefined), "```");
  assert.equal(advanceFence("code", "```"), "```");
  assert.equal(advanceFence("```", "```"), undefined);
  assert.equal(advanceFence(":::{note}", undefined), undefined);
  assert.equal(advanceFence(":::{note}", undefined, true), ":::");
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-097
test("escapeHtml and escapeRegExp", () => {
  assert.equal(escapeHtml(`<a href="x">&</a>`), "&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;");
  assert.equal(escapeHtml(`"a"`, false), `"a"`);
  assert.equal(new RegExp(escapeRegExp("a.b*c(d)[e]")).test("a.b*c(d)[e]"), true);
  assert.equal(new RegExp(`^${escapeRegExp("a.b")}$`).test("axb"), false);
});
