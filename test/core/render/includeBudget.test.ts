import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { test } from "node:test";

import {
  INCLUDE_BUDGET_MAX_CHARS,
  INCLUDE_BUDGET_MAX_EXPANSIONS,
  renderMyst,
  type MystRenderContext,
} from "../../../src/core/render/mystRenderer";

const goldenPath = path.resolve(__dirname, "../../../../test/core/render/include-fixtures/equivalence.golden.html");
const root = "/virtual";

function virtualContext(files: Record<string, string>, reads: string[] = []): MystRenderContext {
  return {
    sourcePath: `${root}/main.md`,
    resolveInclude: (request, from) => {
      const target = path.posix.resolve(path.posix.dirname(from), request);
      reads.push(target);
      const source = files[target];
      return source === undefined ? undefined : { path: target, source };
    },
  };
}

const EQUIVALENCE_MAIN = [
  "# Main",
  "",
  "```{include} part.md",
  "```",
  "",
  "Between includes.",
  "",
  "```{include} part.md",
  "```",
  "",
  "```{include} sub/nested.md",
  "```",
  "",
  "```{include} missing.md",
  "```",
  "",
  "```{include} cycle-a.md",
  "```",
  "",
  "```{include} part.md",
  ":class: wide",
  "```",
  "",
  "```{include} part.md",
  ":start-line: 1",
  "```",
  "",
  "```{include} part.md",
  ":literal:",
  "```",
  "",
].join("\n");

const EQUIVALENCE_FILES: Record<string, string> = {
  [`${root}/part.md`]: "---\ntitle: skipped\n---\n\nPart paragraph with **bold**.\n\n- item one\n- item two\n",
  [`${root}/sub/nested.md`]: "## Nested\n\n```{include} ../part.md\n```\n\nAfter nested.\n",
  [`${root}/cycle-a.md`]: "Cycle A\n\n```{include} cycle-b.md\n```\n",
  [`${root}/cycle-b.md`]: "Cycle B\n\n```{include} cycle-a.md\n```\n",
};

test("include expansion output is unchanged for ordinary documents", async () => {
  const result = await renderMyst(EQUIVALENCE_MAIN, virtualContext(EQUIVALENCE_FILES));
  const snapshot = `${result.html}\n<!--${JSON.stringify({
    diagnostics: result.diagnostics,
    dependencies: [...result.dependencies].sort(),
  })}-->\n`;
  if (process.env.UPDATE_INCLUDE_GOLDEN === "1") {
    fs.writeFileSync(goldenPath, snapshot);
  }
  assert.equal(snapshot, fs.readFileSync(goldenPath, "utf8"));
});

function fanOutFiles(depth: number, fan: number): Record<string, string> {
  const files: Record<string, string> = {};
  for (let level = 0; level < depth; level += 1) {
    files[`${root}/l${level}.md`] = Array.from(
      { length: fan },
      () => `\`\`\`{include} l${level + 1}.md\n\`\`\`\n`,
    ).join("\n");
  }
  files[`${root}/l${depth}.md`] = "leaf paragraph\n";
  return files;
}

test("include fan-out stops at the budget with one diagnostic", async () => {
  const reads: string[] = [];
  const files = fanOutFiles(5, 10);
  const context = { ...virtualContext(files, reads), sourcePath: `${root}/l0.md` };
  const result = await renderMyst(files[`${root}/l0.md`], context);
  const budget = result.diagnostics.filter((entry) => /include budget/iu.test(entry.message));
  assert.equal(budget.length, 1, JSON.stringify(result.diagnostics.slice(0, 5)));
  assert.equal(result.diagnostics.length, 1, "leftover includes must not add per-directive warnings");
  assert.ok(reads.length <= INCLUDE_BUDGET_MAX_EXPANSIONS + 50, `reads: ${reads.length}`);
  assert.match(result.html, /myst-unresolved/u);
});

test("an include repeated many times is read once per render", async () => {
  const reads: string[] = [];
  const files: Record<string, string> = {
    [`${root}/part.md`]: "Shared paragraph.\n",
  };
  const main = Array.from({ length: 30 }, () => "```{include} part.md\n```\n").join("\n");
  const result = await renderMyst(main, virtualContext(files, reads));
  assert.equal(reads.filter((entry) => entry === `${root}/part.md`).length, 1);
  assert.equal(result.html.split("Shared paragraph.").length - 1, 30);
  assert.equal(result.diagnostics.length, 0);
});

test("memoised included ASTs keep the include line of each directive", async () => {
  const files = { [`${root}/part.md`]: "Shared paragraph.\n" };
  const main = "```{include} part.md\n```\n\nMiddle.\n\n```{include} part.md\n```\n";
  const result = await renderMyst(main, virtualContext(files));
  const lines = [...result.html.matchAll(/data-line="(\d+)"[^>]*>Shared paragraph/gu)]
    .map((match) => match[1]);
  assert.equal(new Set(lines).size, 2, result.html);
});

test("the included text budget bounds large includes", async () => {
  const big = "x".repeat(Math.floor(INCLUDE_BUDGET_MAX_CHARS / 4)) + "\n";
  const files: Record<string, string> = {};
  for (let i = 0; i < 8; i += 1) files[`${root}/big${i}.md`] = `${big}${i}\n`;
  const main = Array.from({ length: 8 }, (_, i) => `\`\`\`{include} big${i}.md\n\`\`\`\n`).join("\n");
  const result = await renderMyst(main, virtualContext(files));
  assert.equal(result.diagnostics.filter((entry) => /include budget/iu.test(entry.message)).length, 1);
});

test("a 60-chapter book with 5 snippets each renders fully within the budget", async () => {
  const files: Record<string, string> = {};
  for (let s = 0; s < 5; s += 1) files[`${root}/snip${s}.md`] = `Snippet ${s} text.\n`;
  const snippets = Array.from({ length: 5 }, (_, s) => `\`\`\`{include} snip${s}.md\n\`\`\`\n`).join("\n");
  let main = "";
  for (let c = 0; c < 60; c += 1) {
    files[`${root}/ch${c}.md`] = `## Chapter ${c}\n\n${snippets}`;
    main += `\`\`\`{include} ch${c}.md\n\`\`\`\n\n`;
  }
  const result = await renderMyst(main, virtualContext(files));
  assert.equal(result.diagnostics.length, 0, JSON.stringify(result.diagnostics.slice(0, 2)));
  assert.equal(result.html.split("<h2").length - 1, 60);
  for (let s = 0; s < 5; s += 1) {
    assert.equal(result.html.split(`Snippet ${s} text.`).length - 1, 60);
  }
});

test("the expansion budget boundary is exactly the maximum", async () => {
  const files = { [`${root}/part.md`]: "Part.\n" };
  const render = (count: number) => renderMyst(
    Array.from({ length: count }, () => "```{include} part.md\n```\n").join("\n"),
    virtualContext(files),
  );
  const atLimit = await render(INCLUDE_BUDGET_MAX_EXPANSIONS);
  assert.equal(atLimit.diagnostics.length, 0);
  const over = await render(INCLUDE_BUDGET_MAX_EXPANSIONS + 1);
  assert.equal(over.diagnostics.length, 1);
  assert.match(over.diagnostics[0].message, /include budget/iu);
});
