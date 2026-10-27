import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
  compileFind,
  expandReplacement,
  findInText,
  occurrenceStarts,
  type FindOptions,
  type FindPattern,
} from "../../../src/core/find/findMatches";

const plain: FindOptions = { matchCase: false, wholeWord: false, regex: false };

function pattern(query: string, options: Partial<FindOptions> = {}): RegExp {
  const compiled: FindPattern | undefined = compileFind(query, { ...plain, ...options });
  assert.ok(compiled && "pattern" in compiled, "the query compiles");
  return compiled.pattern;
}

const spans = (text: string, regex: RegExp): Array<[number, number]> =>
  findInText(text, regex).map((match) => [match.start, match.end]);

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-010
test("a literal query finds every occurrence, ignoring case unless asked", () => {
  assert.deepEqual(spans("Studio studio STUDIO", pattern("studio")), [[0, 6], [7, 13], [14, 20]]);
  assert.deepEqual(spans("Studio studio STUDIO", pattern("studio", { matchCase: true })), [[7, 13]]);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-010
test("regular expression characters of a literal query are plain text", () => {
  assert.deepEqual(spans("a.b axb (a.b)", pattern("a.b")), [[0, 3], [9, 12]]);
  assert.deepEqual(spans("1+1=2 and 1/1", pattern("1+1")), [[0, 3]]);
  assert.deepEqual(spans("a-b", pattern("a-b")), [[0, 3]]);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-011
test("whole word does not match inside a longer word", () => {
  const word = pattern("art", { wholeWord: true });
  assert.deepEqual(spans("part arts art", word), [[10, 13]]);
  assert.deepEqual(spans("éart art2 art", word), [[10, 13]]);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-011
test("a regular expression query is used as written, and an invalid one answers with the reason", () => {
  assert.deepEqual(spans("v1 v22 vx", pattern("v\\d+", { regex: true })), [[0, 2], [3, 6]]);
  const broken = compileFind("(unclosed", { ...plain, regex: true });
  assert.ok(broken && "error" in broken);
  assert.match(broken.error, /\S/u);
  assert.equal(compileFind("", plain), undefined);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-010
test("empty matches are skipped and the number of matches is capped", () => {
  assert.deepEqual(spans("baab", pattern("a*", { regex: true })), [[1, 3]]);
  assert.equal(findInText("aaaaaa", pattern("a"), 3).length, 3);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-012
test("a regular expression replacement expands groups, the match and the dollar sign", () => {
  const [match] = findInText("2026-10-27", pattern("(\\d+)-(\\d+)-(?<day>\\d+)", { regex: true }));
  assert.ok(match);
  assert.equal(expandReplacement("$3/$2/$1", match, true), "27/10/2026");
  assert.equal(expandReplacement("[$&] $$ <$<day>>", match, true), "[2026-10-27] $ <27>");
  assert.equal(expandReplacement("$4 $<nope>", match, true), "$4 $<nope>");
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-012
test("a literal replacement is inserted as typed, and a two-digit group falls back to one digit", () => {
  const [match] = findInText("ab", pattern("(a)(b)", { regex: true }));
  assert.ok(match);
  assert.equal(expandReplacement("$1 $&", match, false), "$1 $&");
  assert.equal(expandReplacement("$12", match, true), "a2");
});

test("occurrence starts include overlapping occurrences", () => {
  assert.deepEqual(occurrenceStarts("aaaa", "aa"), [0, 1, 2]);
  assert.deepEqual(occurrenceStarts("abc", ""), []);
});
