import * as assert from "node:assert/strict";
import { test } from "node:test";

import { EditLock, isUnchangedSave, needsRefresh } from "../../src/state/editLock";

test("a previewReady with another requestId releases the lock (STAB-02)", () => {
  const lock = new EditLock();
  lock.acquire(4);
  assert.equal(lock.isHeld, true);
  assert.equal(lock.onPreviewReady(4).released, false, "the page of the edit's own render keeps it");
  assert.equal(lock.isHeld, true);
  assert.equal(lock.onPreviewReady(5).released, true, "a newer page has no inline editor");
  assert.equal(lock.isHeld, false);
  assert.equal(lock.shouldDeferReload(), false);
});

test("previewReady without a lock releases nothing", () => {
  const lock = new EditLock();
  assert.deepEqual(lock.onPreviewReady(1), { released: false, flush: [] });
});

test("reloads are deferred while held and flushed once on release", () => {
  const lock = new EditLock();
  const calls: string[] = [];
  lock.acquire(1);
  assert.equal(lock.shouldDeferReload(), true);
  lock.defer("plantuml", () => calls.push("plantuml-old"));
  lock.defer("plantuml", () => calls.push("plantuml"));
  lock.defer("links", () => calls.push("links"));
  lock.defer("render", () => calls.push("render"));
  lock.drop("render");
  for (const work of lock.release()) work();
  assert.deepEqual(calls, ["plantuml", "links"]);
  assert.deepEqual(lock.release(), [], "nothing is flushed twice");
});

test("a ready report of another render hands back the queued work", () => {
  const lock = new EditLock();
  let ran = 0;
  lock.acquire(1);
  lock.defer("render", () => { ran += 1; });
  const outcome = lock.onPreviewReady(2);
  assert.equal(outcome.released, true);
  outcome.flush.forEach((work) => work());
  assert.equal(ran, 1);
});

test("time alone never releases the lock", () => {
  const lock = new EditLock();
  lock.acquire(1);
  assert.equal(lock.shouldDeferReload(), true);
  // No API depends on a clock: only a ready report of another render or release() ends it.
  assert.equal(lock.onPreviewReady(1).released, false);
  assert.equal(lock.isHeld, true);
});

test("a save of an unchanged open buffer needs no render (PERF-06)", () => {
  assert.equal(isUnchangedSave({ isActiveDocument: true, documentVersion: 7, stageVersion: 7 }), true);
  assert.equal(isUnchangedSave({ isActiveDocument: true, documentVersion: 8, stageVersion: 7 }), false);
  assert.equal(isUnchangedSave({ isActiveDocument: true, documentVersion: undefined, stageVersion: 7 }), false);
  assert.equal(isUnchangedSave({ isActiveDocument: false, documentVersion: 7, stageVersion: 7 }), false);
});

test("a ready of the same render that reports no open editor releases the lock", () => {
  const lock = new EditLock();
  lock.acquire(3);
  assert.equal(lock.onPreviewReady(3, true).released, false);
  assert.equal(lock.onPreviewReady(3).released, false, "a message without the field keeps the old rule");
  assert.equal(lock.onPreviewReady(3, false).released, true);
  assert.equal(lock.isHeld, false);
});

test("a changed dependency always re-renders, whatever version the stage shows", () => {
  const rendered = { shownStatus: "success", documentVersion: 7, stageVersion: 7 };
  assert.equal(needsRefresh({ ...rendered, isDependencyChange: true }), true, "include target changed");
  assert.equal(needsRefresh({ ...rendered, shownStatus: "recovery", isDependencyChange: true }), true);
});

test("a save of the already rendered buffer is skipped (PERF-06), any other state renders", () => {
  const rendered = { isDependencyChange: false, shownStatus: "success", documentVersion: 7, stageVersion: 7 };
  assert.equal(needsRefresh(rendered), false);
  assert.equal(needsRefresh({ ...rendered, shownStatus: "recovery" }), false);
  assert.equal(needsRefresh({ ...rendered, stageVersion: 6 }), true, "buffer changed since the render");
  assert.equal(needsRefresh({ ...rendered, stageVersion: undefined }), true);
  assert.equal(needsRefresh({ ...rendered, shownStatus: "error" }), true, "the shown error is retried");
});
