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

test("an editor the page opened defers page updates and finished renders until it closes (STAB-03)", () => {
  const lock = new EditLock();
  const calls: string[] = [];
  lock.openPageEditor("edit-1");
  assert.equal(lock.pageEditorOpen, true);
  assert.equal(lock.shouldDeferReload(), true, "before its first autosave too");
  assert.equal(lock.shouldDeferResult(), true, "a render that finishes now waits as well");
  lock.defer("theme", () => calls.push("theme"));
  lock.defer("render-result", () => calls.push("render-result"));
  assert.deepEqual(lock.closePageEditor("edit-other"), [], "another editor's close changes nothing");
  assert.equal(lock.pageEditorOpen, true);
  for (const work of lock.closePageEditor("edit-1")) work();
  assert.deepEqual(calls, ["theme", "render-result"]);
  assert.equal(lock.shouldDeferReload(), false);
  assert.equal(lock.shouldDeferResult(), false);
});

test("the host lock alone defers page work but lets a finished render through", () => {
  const lock = new EditLock();
  lock.acquire(2);
  assert.equal(lock.shouldDeferReload(), true);
  assert.equal(lock.shouldDeferResult(), false, "an explicit refresh still renders while the host holds an edit");
});

test("closing the page editor while the host edit is held keeps the queued work for the host release", () => {
  const lock = new EditLock();
  let ran = 0;
  lock.openPageEditor("edit-1");
  lock.acquire(4);
  lock.defer("render", () => { ran += 1; });
  assert.deepEqual(lock.closePageEditor("edit-1"), [], "the host still applies the edit");
  lock.release().forEach((work) => work());
  assert.equal(ran, 1);
});

test("a host edit that ends with an error keeps page work waiting while the editor stays open", () => {
  const lock = new EditLock();
  let ran = 0;
  lock.openPageEditor("edit-1");
  lock.acquire(4);
  lock.defer("render", () => { ran += 1; });
  assert.deepEqual(lock.releaseHostEdit(), [], "the editor still shows the error and its text");
  assert.equal(lock.shouldDeferReload(), true);
  lock.closePageEditor().forEach((work) => work());
  assert.equal(ran, 1);
  const alone = new EditLock();
  alone.acquire(1);
  alone.defer("links", () => { ran += 1; });
  alone.releaseHostEdit().forEach((work) => work());
  assert.equal(ran, 2, "without a page editor the work runs at once");
});

test("release forgets the page editor (the page was replaced) and a replaced deferral is discarded", () => {
  const lock = new EditLock();
  const discarded: string[] = [];
  lock.openPageEditor("edit-1");
  lock.defer("render-result", () => undefined, () => discarded.push("first"));
  lock.defer("render-result", () => undefined, () => discarded.push("second"));
  assert.deepEqual(discarded, ["first"], "the older result is freed when a newer one replaces it");
  lock.drop("render-result");
  assert.deepEqual(discarded, ["first", "second"], "a dropped result is freed too");
  lock.release();
  assert.equal(lock.pageEditorOpen, false);
  assert.equal(lock.shouldDeferReload(), false);
});
