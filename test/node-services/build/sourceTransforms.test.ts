import assert from "node:assert/strict";
import { test } from "node:test";

import {
  appendPreviewBibliography,
  expandGithubAlerts,
} from "../../../src/node-services/build/sourceTransforms";

test("github alerts become MyST admonitions", () => {
  const source = "intro\n\n> [!NOTE]\n> Useful information.\n\nafter\n";
  const result = expandGithubAlerts(source);
  assert.match(result, /:::\{note\}\nUseful information\.\n:::/u);
});

test("github alert expansion preserves line numbers", () => {
  const source = "a\n\n> [!WARNING]\n> Careful.\n\nb\n";
  const result = expandGithubAlerts(source);
  assert.equal(result.split("\n").length, source.split("\n").length);
  assert.equal(result.split("\n").indexOf("b"), source.split("\n").indexOf("b"));
});

test("every supported github alert type maps to an admonition", () => {
  for (const [marker, directive] of [
    ["NOTE", "note"],
    ["TIP", "tip"],
    ["IMPORTANT", "important"],
    ["WARNING", "warning"],
    ["CAUTION", "caution"],
  ]) {
    const result = expandGithubAlerts(`> [!${marker}]\n> body\n\n`);
    assert.match(result, new RegExp(`:::\\{${directive}\\}`, "u"));
  }
});

test("unknown alert markers stay untouched", () => {
  const source = "> [!UNKNOWN]\n> body\n\n";
  assert.equal(expandGithubAlerts(source), source);
});

test("alerts inside fenced code blocks are not rewritten", () => {
  const source = "```md\n> [!NOTE]\n> body\n```\n";
  assert.equal(expandGithubAlerts(source), source);
});

test("appends a bibliography when citations need resolving", () => {
  const source = "# Chapter\n\nA claim {cite}`karp-1996` here.\n";
  const result = appendPreviewBibliography(source);
  assert.match(result, /```\{bibliography\}/u);
  assert.ok(result.startsWith(source));
});

test("does not touch documents without citations", () => {
  const source = "# Chapter\n\nNo citations at all.\n";
  assert.equal(appendPreviewBibliography(source), source);
});

test("respects an existing bibliography directive", () => {
  const source = "# Chapter\n\n{cite}`karp-1996`\n\n```{bibliography}\n```\n";
  assert.equal(appendPreviewBibliography(source), source);
});