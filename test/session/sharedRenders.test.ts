/**
 * The shared renders (`src/session/sharedRenders.ts`): consumers of one key share one render and
 * the render ends with the last stage copy.
 */

import * as assert from "node:assert/strict";
import { test } from "node:test";

import type { RenderResult } from "../../src/core/render/renderPipeline";
import { SHARED_RENDER_WINDOW_MS, SharedRenders, type SharedRenderKey } from "../../src/session/sharedRenders";

const KEY: SharedRenderKey = {
  documentId: "file:///w/a.md",
  revision: 3,
  workspaceRoot: "/w",
  readOnly: false,
  trusted: true,
  plantUmlJarPath: undefined,
  plantUmlEngine: "builtin",
};

function fakeRun(counter: { runs: number; disposed: number }) {
  return (): Promise<RenderResult> => {
    counter.runs += 1;
    return Promise.resolve({
      stage: { requestId: 0, dispose: () => { counter.disposed += 1; } },
      html: "<p>x</p>",
    } as unknown as RenderResult);
  };
}

// @tests_req SwRS-MDOKFSTUDIO-LIFE-039
test("consumers of one key share one render; the stage is disposed with the last copy", async () => {
  const shared = new SharedRenders();
  const counter = { runs: 0, disposed: 0 };
  const signal = new AbortController().signal;
  const [a, b] = await Promise.all([
    shared.acquire(KEY, 4, signal, fakeRun(counter)),
    shared.acquire(KEY, 9, signal, fakeRun(counter)),
  ]);
  assert.equal(counter.runs, 1);
  assert.deepEqual([a.stage.requestId, b.stage.requestId], [4, 9]);
  a.stage.dispose();
  a.stage.dispose();
  b.stage.dispose();
  assert.equal(counter.disposed, 0, "the window keeps the render joinable");
  await new Promise((resolve) => setTimeout(resolve, SHARED_RENDER_WINDOW_MS + 50));
  assert.equal(counter.disposed, 1);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-039
test("another revision, or an invalidation, starts its own render", async () => {
  const shared = new SharedRenders();
  const counter = { runs: 0, disposed: 0 };
  const signal = new AbortController().signal;
  const first = await shared.acquire(KEY, 1, signal, fakeRun(counter));
  await shared.acquire({ ...KEY, revision: 4 }, 2, signal, fakeRun(counter));
  assert.equal(counter.runs, 2, "a new revision renders again");
  shared.invalidate();
  await shared.acquire(KEY, 3, signal, fakeRun(counter));
  assert.equal(counter.runs, 3, "an invalidated render is not joined");
  first.stage.dispose();
  shared.invalidate();
});
