import * as assert from "node:assert/strict";
import { test } from "node:test";
import { isDeepStrictEqual } from "node:util";

import { isSameData } from "../../../src/core/frontmatter/sameData";

// Tests added by the mutation campaign of src/core (CR-450): they pin the survivors of the first run.
// Every pair is decided against Node's util.isDeepStrictEqual, the contract of the module.

const tag = Symbol("tag");
const other = Symbol("other");
const hidden = Object.defineProperty({}, tag, { value: 1, enumerable: false });
const withKey = <T extends object>(value: T, key: string | symbol, entry: unknown): T => Object.assign(value, { [key]: entry });
const buffer = new Uint8Array([9, 1, 2, 9]).buffer;

class Point {
  constructor(public x: number) {}
}

const cases: Array<[string, unknown[]]> = [
  ["symbol keys", [{ [tag]: 1 }, { [tag]: 2 }, { [tag]: 1 }, { [other]: 1 }, {}, hidden, { [tag]: 1, [other]: 1 }, { [tag]: undefined }]],
  ["sets of objects", [
    new Set([{ a: 1 }, { a: 1 }]), new Set([{ a: 1 }, { a: 2 }]), new Set([{ a: 2 }, { a: 1 }]), new Set([{ a: 1 }]),
    new Set([1, { a: 1 }]), new Set([2, { a: 1 }]), new Set([{ a: 1 }, 1]), new Set([null]), new Set([{}]), new Set([undefined]),
    new Set([1]), new Set([1, 2]), new Set([[1], [2]]), new Set([[2], [1]]), new Set(["a"]), new Set(["b"]), withKey(new Set([1]), "x", 1),
  ]],
  ["maps of objects", [
    new Map([[{ k: 1 }, { v: 1 }]]), new Map([[{ k: 1 }, { v: 2 }]]), new Map([[{ k: 2 }, { v: 1 }]]),
    new Map([[{ k: 1 }, 1], [{ k: 2 }, 2]]), new Map([[{ k: 2 }, 2], [{ k: 1 }, 1]]), new Map([[{ k: 2 }, 1], [{ k: 1 }, 2]]),
    new Map([[{ k: 1 }, 1], [{ k: 1 }, 2]]), new Map([[{ k: 1 }, 2], [{ k: 1 }, 1]]), new Map([[{ k: 1 }, 1], [{ k: 1 }, 1]]),
    new Map([[null, 1]]), new Map([[{}, 1]]), new Map([[undefined, 1]]), new Map([["a", 1]]), new Map([["b", 1]]), new Map([["a", 1], ["b", 2]]),
    new Map([["a", 1], ["b", 2]]), new Map([["b", 2], ["a", 1]]), new Map([["a", { z: 1 }]]), new Map([["a", { z: 2 }]]), withKey(new Map([["a", 1]]), "x", 1),
  ]],
  ["arrays", [[1, 2], [1, 3], [1], [1, 2, 3], [, 1], [undefined, 1], [1, ,], [1, undefined], withKey([1], "x", 1), withKey([1], "x", 2), [], [[]], [[1]], [[2]]]],
  ["dates", [new Date(0), new Date(1), new Date(Number.NaN), new Date(Number.NaN), withKey(new Date(0), "x", 1), new Date(0)]],
  ["typed arrays", [
    new Uint8Array([1, 2]), new Uint8Array([1, 2]), new Uint8Array([1, 3]), new Uint8Array([1]), new Uint8Array([1, 2, 3]), new Uint8Array(0),
    new Uint16Array([1, 2]), new Int8Array([1, 2]), new Uint8Array(buffer, 1, 2), new Uint8Array([1, 2]), new Uint8Array(buffer, 0, 2),
    withKey(new Uint8Array([1, 2]), "x", 1),
  ]],
  ["prototypes", [new Point(1), new Point(1), new Point(2), { x: 1 }, Object.create(null), {}, Object.create(Array.prototype), [], Object.create(Date.prototype)]],
  ["objects", [{ a: 1, b: 2 }, { b: 2, a: 1 }, { a: 1 }, { a: 1, b: undefined }, { a: undefined }, { b: undefined }, { a: { b: [1] } }, { a: { b: [2] } }]],
];

// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-043#S2
// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-043#S5
test("isSameData decides like util.isDeepStrictEqual on every pair of the same family", () => {
  let compared = 0;
  for (const [family, values] of cases) {
    for (const [i, a] of values.entries()) {
      for (const [j, b] of values.entries()) {
        assert.equal(isSameData(a, b), isDeepStrictEqual(a, b), `${family}: ${i} and ${j}`);
        compared += 1;
      }
    }
  }
  assert.ok(compared > 800);
});

// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-043#S5
test("isSameData matches the members of a set or the keys of a map whatever their order, using each match once", () => {
  assert.equal(isSameData(new Set([{ a: 1 }, { a: 2 }]), new Set([{ a: 2 }, { a: 1 }])), true);
  assert.equal(isSameData(new Set([{ a: 1 }, { a: 1 }]), new Set([{ a: 1 }, { a: 2 }])), false, "one match cannot serve two members");
  assert.equal(isSameData(new Set([null]), new Set([{}])), false);
  assert.equal(isSameData(new Map([[{ k: 1 }, 1], [{ k: 2 }, 2]]), new Map([[{ k: 2 }, 2], [{ k: 1 }, 1]])), true);
  assert.equal(isSameData(new Map([[{ k: 1 }, 1], [{ k: 2 }, 2]]), new Map([[{ k: 2 }, 1], [{ k: 1 }, 2]])), false, "the value follows its key");
  assert.equal(isSameData(new Map([[null, 1]]), new Map([[{}, 1]])), false);
  assert.equal(isSameData(new Map([["a", 1]]), new Map([["b", 1]])), false);
});
