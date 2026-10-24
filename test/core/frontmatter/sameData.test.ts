import * as assert from "node:assert/strict";
import { test } from "node:test";
import { isDeepStrictEqual } from "node:util";

import { parseDocument } from "yaml";

import { isSameData } from "../../../src/core/frontmatter/sameData";

// The values the frontmatter patches compare: what the YAML parser produces (1.2 core and 1.1
// schemas), structured clones of it, and near misses of each.
const YAML_SOURCES = [
  "title: A\ntags: [a, b]\ncount: 3\n",
  "title: A\ntags: [a, b]\ncount: 3.0\n",
  "a: .nan\nb: -0.0\nc: 0\nd: .inf\n",
  "a: null\nb: ~\nc: \"\"\n",
  "nested: {x: [1, {y: 2}], z: true}\n",
  "nested: {z: true, x: [1, {y: 2}]}\n",
  "%YAML 1.1\n---\nwhen: 2026-10-24\nbin: !!binary aGVsbG8=\nset: !!set {a, b}\nomap: !!omap [{a: 1}, {b: 2}]\n",
  "%YAML 1.1\n---\nwhen: 2026-10-25\nbin: !!binary aGVsbG8h\nset: !!set {a, c}\nomap: !!omap [{a: 1}, {b: 3}]\n",
  "anchor: &a [1, 2]\nalias: *a\n",
  "big: 12345678901234567890\n",
  // Recursive aliases parse to cyclic objects; Node's function tracks the pairs on the path.
  "a: &x\n  b: *x\n",
  "a: &x\n  b: *x\n  c: 1\n",
  "a: &x\n  b:\n    b: *x\n",
  "a: &x [1, *x]\n",
  "a: &x [1, [1, *x]]\n",
  "a: &x [2, *x]\n",
  "a: &x\n  b: *x\nc: *x\n",
  "a: &x\n  b: &y\n    c: *x\n    d: *y\n",
];

function values(): unknown[] {
  const parsed = YAML_SOURCES.map((source) => parseDocument(source).toJS({ maxAliasCount: 100 }) as unknown);
  const extra: unknown[] = [
    0, -0, NaN, 1, "1", true, false, null, undefined, [], {}, [undefined], [, 1], [1, 2], [2, 1],
    { a: 1 }, { a: 1, b: undefined }, { b: undefined, a: 1 }, Object.assign(Object.create(null), { a: 1 }),
    new Date(0), new Date(1), new Map([["a", 1]]), new Map([["a", 2]]), new Set([1, 2]), new Set([2, 1]),
    new Set([{ a: 1 }]), new Set([{ a: 2 }]), new Map([[{ k: 1 }, 1]]), new Map([[{ k: 1 }, 2]]),
    new Uint8Array([1, 2]), new Uint8Array([1, 3]), ["a", "b"], ["a", "b", "c"],
  ];
  return [...parsed, ...parsed.map((value) => structuredClone(value)), ...extra];
}

test("isSameData decides like util.isDeepStrictEqual on parsed YAML and near misses", () => {
  const all = values();
  let compared = 0;
  for (const [i, a] of all.entries()) {
    for (const [j, b] of all.entries()) {
      assert.equal(isSameData(a, b), isDeepStrictEqual(a, b), `values ${i} and ${j}`);
      compared += 1;
    }
  }
  assert.ok(compared > 2000);
});

test("isSameData compares key lists in order, as the patch verification needs", () => {
  assert.equal(isSameData(["a", "b"], ["a", "b"]), true);
  assert.equal(isSameData(["a", "b"], ["b", "a"]), false);
});
