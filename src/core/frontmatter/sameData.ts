/**
 * Strict structural equality of parsed YAML data, host-neutral (the core imports no Node
 * built-in, so not `util.isDeepStrictEqual`). It gives the same answer as Node's
 * `isDeepStrictEqual` for every value the YAML parser produces: primitives compared with
 * `Object.is` (`NaN` equals `NaN`, `0` differs from `-0`), arrays, plain and null-prototype objects
 * (same prototype, same own enumerable keys in any order), the YAML 1.1 types (`Date`, `Map`,
 * `Set`, `Uint8Array`), and the cyclic structures a recursive alias (`a: &x {b: *x}`) produces.
 * `test/core/frontmatter/sameData.test.ts` pins it against Node's function.
 */

/**
 * The objects on the current comparison path, each with its depth, one map per side. A pair that
 * comes back to an object already on the path is equal when both sides come back to the same
 * depth, as Node's cycle memos decide it.
 */
interface PathMemo {
  readonly left: Map<object, number>;
  readonly right: Map<object, number>;
}

function sameEntries(a: object, b: object, memo: PathMemo): boolean {
  const keysA = Object.keys(a);
  if (keysA.length !== Object.keys(b).length) return false;
  for (const key of keysA) {
    if (!Object.prototype.propertyIsEnumerable.call(b, key)) return false;
    if (!same((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key], memo)) return false;
  }
  const symbolsA = Object.getOwnPropertySymbols(a).filter((symbol) => Object.prototype.propertyIsEnumerable.call(a, symbol));
  const symbolsB = Object.getOwnPropertySymbols(b).filter((symbol) => Object.prototype.propertyIsEnumerable.call(b, symbol));
  if (symbolsA.length !== symbolsB.length) return false;
  return symbolsA.every((symbol) => Object.prototype.propertyIsEnumerable.call(b, symbol)
    && same((a as Record<symbol, unknown>)[symbol], (b as Record<symbol, unknown>)[symbol], memo));
}

function sameSet(a: Set<unknown>, b: Set<unknown>, memo: PathMemo): boolean {
  if (a.size !== b.size) return false;
  const unmatched = [...b].filter((value) => typeof value === "object" && value !== null && !a.has(value));
  for (const value of a) {
    if (b.has(value)) continue;
    if (typeof value !== "object" || value === null) return false;
    const index = unmatched.findIndex((candidate) => same(value, candidate, memo));
    if (index < 0) return false;
    unmatched.splice(index, 1);
  }
  return true;
}

function sameMap(a: Map<unknown, unknown>, b: Map<unknown, unknown>, memo: PathMemo): boolean {
  if (a.size !== b.size) return false;
  const unmatched = [...b.keys()].filter((key) => typeof key === "object" && key !== null && !a.has(key));
  for (const [key, value] of a) {
    if (b.has(key)) {
      if (!same(value, b.get(key), memo)) return false;
      continue;
    }
    if (typeof key !== "object" || key === null) return false;
    const index = unmatched.findIndex((candidate) => same(key, candidate, memo) && same(value, b.get(candidate), memo));
    if (index < 0) return false;
    unmatched.splice(index, 1);
  }
  return true;
}

function sameObject(a: object, b: object, memo: PathMemo): boolean {
  if (Array.isArray(a)) {
    const other = b as unknown[];
    if (a.length !== other.length) return false;
    for (let index = 0; index < a.length; index += 1) {
      if (Object.hasOwn(a, index) !== Object.hasOwn(other, index)) return false;
      if (!same(a[index], other[index], memo)) return false;
    }
    return sameEntries(a, other, memo);
  }
  if (a instanceof Date) {
    return Object.is(a.getTime(), (b as Date).getTime()) && sameEntries(a, b, memo);
  }
  if (ArrayBuffer.isView(a)) {
    const left = new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
    const view = b as ArrayBufferView;
    const right = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
    if (left.length !== right.length || left.some((byte, index) => byte !== right[index])) return false;
    return sameEntries(a, b, memo);
  }
  if (a instanceof Set) return sameSet(a, b as Set<unknown>, memo) && sameEntries(a, b, memo);
  if (a instanceof Map) return sameMap(a, b as Map<unknown, unknown>, memo) && sameEntries(a, b, memo);
  return sameEntries(a, b, memo);
}

function same(a: unknown, b: unknown, memo: PathMemo): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;
  if (Object.prototype.toString.call(a) !== Object.prototype.toString.call(b)) return false;
  const leftDepth = memo.left.get(a);
  const rightDepth = memo.right.get(b);
  if (leftDepth !== undefined || rightDepth !== undefined) return leftDepth === rightDepth;
  const depth = memo.left.size;
  memo.left.set(a, depth);
  memo.right.set(b, depth);
  try {
    return sameObject(a, b, memo);
  } finally {
    memo.left.delete(a);
    memo.right.delete(b);
  }
}

/** True when `a` and `b` hold the same data, as Node's `util.isDeepStrictEqual` decides it. */
export function isSameData(a: unknown, b: unknown): boolean {
  return same(a, b, { left: new Map(), right: new Map() });
}
