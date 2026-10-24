import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createMermaidCache, diagramKey } from "../../../src/page/modules/mermaidCache";

const theme = { primaryColor: "#111", fontFamily: "sans" };

test("PERF-07: a diagram already drawn with the same source and theme is not drawn again", () => {
  const cache = createMermaidCache(4);
  const key = diagramKey(theme, "graph TD; A-->B");
  assert.equal(cache.plan(undefined, key).action, "render", "first draw");
  cache.store(key, "data:svg-1");
  assert.equal(cache.plan(key, key).action, "keep", "the drawn diagram is up to date");
  assert.deepEqual(cache.plan(undefined, key), { action: "reuse", image: "data:svg-1" },
    "a replaced node with the same source reuses the drawing");
});

test("PERF-07: a theme change or a source change draws again", () => {
  const cache = createMermaidCache(4);
  const key = diagramKey(theme, "graph TD; A-->B");
  cache.store(key, "data:svg-1");
  assert.equal(cache.plan(key, diagramKey({ ...theme, primaryColor: "#222" }, "graph TD; A-->B")).action, "render");
  assert.equal(cache.plan(key, diagramKey(theme, "graph TD; A-->C")).action, "render");
  assert.notEqual(diagramKey(theme, "a"), diagramKey({ ...theme, fontFamily: "a" }, ""), "keys cannot collide across the separator");
});

test("PERF-07: the cache holds a bounded number of drawings, least recently used first out", () => {
  const cache = createMermaidCache(2);
  cache.store("a", "A");
  cache.store("b", "B");
  assert.equal(cache.plan(undefined, "a").action, "reuse", "reading a refreshes it");
  cache.store("c", "C");
  assert.equal(cache.plan(undefined, "b").action, "render", "b was the least recently used");
  assert.equal(cache.plan(undefined, "a").action, "reuse");
  assert.equal(cache.plan(undefined, "c").action, "reuse");
  assert.equal(cache.size, 2);
});
