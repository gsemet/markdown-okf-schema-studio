import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
  BLOCK_EDITOR_BLUR,
  COMMIT_TO_PAGE_BLUR_MS,
  editorBlurBeforePress,
  PAGE_FOCUS,
  PAGE_MOUSEDOWN,
  WINDOW_BLUR_TO_PAGE_BLUR_MS,
} from "../shared/editorBlurInterruption";
import { type HostWitness, PAGE_BLUR, type PageWitness, type TraceEntry } from "../shared/stepInterruption";

// The alert-dropdown stress failure: the WARNING press of a step that started at 500 ms on the
// page's clock, the page having started at 9 500 on the wall clock: 10 000 on the host's. A window
// focus loss blurs the text box first (the page has already lost the focus), then the window, in
// the same task: the trace records the commit, then the page blur (at 601 ms: 10 101 wall clock).
// The host records the window loss 99 ms later.
const before: PageWitness = { startedAt: 9_500, clock: 500, requestId: "4", pageFocus: true };
const samePage: PageWitness = { ...before, clock: 900, pageFocus: false };
const quiet: HostWitness = { pageLoadsBefore: 3, pageLoadsNow: 3, stepStartedAt: 10_000, windowStates: [] };
const windowBlurred: HostWitness = {
  ...quiet,
  windowStates: [{ at: 10_200, focused: false }, { at: 10_300, focused: true }],
};
const commit: TraceEntry = {
  at: 600,
  event: BLOCK_EDITOR_BLUR,
  detail: "related=none commit active=body pageFocus=false",
};
const pageBlur: TraceEntry = { at: 601, event: PAGE_BLUR, detail: "active=body pageFocus=false" };
const warningPress: TraceEntry = {
  at: 590,
  event: PAGE_MOUSEDOWN,
  detail: "option=WARNING prevented=true active=textarea pageFocus=true",
};
const redo = (trace: readonly TraceEntry[], host: HostWitness = windowBlurred): boolean =>
  editorBlurBeforePress(before, samePage, trace, host).redo;

test("a window blur that committed the editor before the press reached the page: redo once", () => {
  const verdict = editorBlurBeforePress(before, samePage, [commit, pageBlur], windowBlurred);
  assert.equal(verdict.redo, true);
  assert.match(verdict.reason, new RegExp("^window blur: page blur at 601 ms .* lost the focus at 10200 .*, "
    + "99 ms from the page blur; "
    + "the block editor committed on it at 600 ms \\(related=none commit ", "u"));
  assert.match(verdict.reason, /and no press reached the page$/u);
  const saved = { at: 604, event: "block editor closed", detail: "saved" };
  assert.equal(redo([commit, saved, { ...pageBlur, at: 605 }]), true,
    "the commit's own records between the commit and its page blur");
  assert.equal(redo([commit, { ...pageBlur, at: 600 + COMMIT_TO_PAGE_BLUR_MS }]), true, "a page blur at the bound");
});

test("a commit in a page that kept the focus, then a later window blur: fail", () => {
  const inFocusedPage = { ...commit, detail: "related=none commit active=body pageFocus=true" };
  const verdict = editorBlurBeforePress(before, samePage, [inFocusedPage, pageBlur], windowBlurred);
  assert.equal(verdict.redo, false);
  assert.match(verdict.reason, new RegExp("^no block editor commit on a window blur since the step started at 500 ms: "
    + "commit at 600 ms .*pageFocus=true\\): not a blur to nowhere", "u"));
  const toElement = { ...commit, detail: "related=button commit active=button pageFocus=false" };
  assert.equal(redo([toElement, pageBlur]), false, "a commit with the focus gone to an element");
});

test("a page blur long after the commit, or after a page focus: fail", () => {
  const seconds = editorBlurBeforePress(before, samePage, [commit, { ...pageBlur, at: 12_600 }], windowBlurred);
  assert.equal(seconds.redo, false);
  assert.match(seconds.reason, /: the next page blur came 12000 ms later$/u);
  assert.equal(redo([commit, { ...pageBlur, at: 601 + COMMIT_TO_PAGE_BLUR_MS }]), false, "just past the bound");
  const refocused = { at: 601, event: PAGE_FOCUS, detail: "active=body pageFocus=true" };
  const focusFirst = editorBlurBeforePress(before, samePage, [commit, refocused, { ...pageBlur, at: 602 }],
    windowBlurred);
  assert.equal(focusFirst.redo, false);
  assert.match(focusFirst.reason, /: a page focus at 601 ms first$/u);
  assert.match(editorBlurBeforePress(before, samePage, [{ ...pageBlur, at: 599 }, commit], windowBlurred).reason,
    /: no page blur after it$/u, "a page blur before the commit");
});

test("a WARNING press that reached the page: fail, even with a window blur and a commit", () => {
  for (const trace of [[warningPress, commit, pageBlur], [commit, pageBlur, { ...warningPress, at: 700 }]]) {
    assert.deepEqual(editorBlurBeforePress(before, samePage, trace, windowBlurred), {
      redo: false,
      reason: `a press reached the page at ${trace.find((entry) => entry.event === PAGE_MOUSEDOWN)!.at} ms: `
        + "option=WARNING prevented=true active=textarea pageFocus=true",
    });
  }
  assert.equal(redo([{ ...warningPress, at: 400 }, commit, pageBlur]), true,
    "a press before the step is not this step's press");
  const elsewhere = { at: 590, event: PAGE_MOUSEDOWN, detail: "body prevented=false active=textarea pageFocus=true" };
  assert.equal(redo([elsewhere, commit, pageBlur]), false, "any press that reached the page is the page's to handle");
});

test("a window loss bound in time to the page blur, before or after it: redo", () => {
  const lossAt = (at: number): HostWitness => ({ ...quiet, windowStates: [{ at, focused: false }] });
  const pageBlurWall = 9_500 + 601;
  assert.equal(redo([commit, pageBlur], lossAt(pageBlurWall + WINDOW_BLUR_TO_PAGE_BLUR_MS)), true, "after, at the bound");
  assert.equal(redo([commit, pageBlur], lossAt(pageBlurWall - 101)), true, "before, at the step's start");
  const bothWays = editorBlurBeforePress(before, samePage, [commit, pageBlur], lossAt(pageBlurWall - 50));
  assert.equal(bothWays.redo, true);
  assert.match(bothWays.reason, /, -50 ms from the page blur; /u);
  const twice: HostWitness = {
    ...quiet,
    windowStates: [{ at: 10_050, focused: false }, { at: 10_060, focused: true }, { at: 14_000, focused: false }],
  };
  assert.equal(redo([commit, pageBlur], twice), true, "a later window loss too");
});

test("a window loss seconds away from the page blur: fail", () => {
  const pageBlurWall = 9_500 + 601;
  const later: HostWitness = { ...quiet, windowStates: [{ at: pageBlurWall + 5_000, focused: false }] };
  const verdict = editorBlurBeforePress(before, samePage, [commit, pageBlur], later);
  assert.equal(verdict.redo, false);
  assert.match(verdict.reason, new RegExp("^no block editor commit on a window blur since the step started at 500 ms: "
    + "commit at 600 ms .*: its page blur at 601 ms \\(10101 wall clock\\) is 5000 ms from the nearest VS Code "
    + "window focus loss \\(at 15101\\), more than 1000 ms: a focus move inside the workbench$", "u"));
  const justPast: HostWitness = {
    ...quiet,
    windowStates: [{ at: pageBlurWall + WINDOW_BLUR_TO_PAGE_BLUR_MS + 1, focused: false }],
  };
  assert.equal(redo([commit, pageBlur], justPast), false, "just past the bound, after");
  // A window loss within the bound before the page blur but before the step started is not the step's.
  const beforeStep: HostWitness = { ...quiet, windowStates: [{ at: 9_990, focused: false }] };
  assert.equal(redo([commit, pageBlur], beforeStep), false, "before the step's start");
});

test("no window blur: fail", () => {
  assert.match(editorBlurBeforePress(before, samePage, [commit, pageBlur], quiet).reason,
    /the VS Code window kept the focus/u, "a page blur inside a focused window");
  assert.match(editorBlurBeforePress(before, samePage, [commit], windowBlurred).reason,
    /: no page blur after it$/u, "a window focus loss the page never saw");
  const earlier = { ...quiet, windowStates: [{ at: 9_900, focused: false }, { at: 10_100, focused: true }] };
  assert.equal(redo([commit, pageBlur], earlier), false, "a window focus loss before the step");
});

test("no block editor commit on blur: fail", () => {
  assert.match(editorBlurBeforePress(before, samePage, [pageBlur], windowBlurred).reason,
    /^no block editor commit on blur since the step started at 500 ms$/u);
  const kept = { ...commit, detail: "related=select kept-in-frame active=select pageFocus=false" };
  assert.equal(redo([kept, pageBlur]), false, "a blur that kept the editor");
  assert.equal(redo([{ ...commit, at: 450 }, { ...pageBlur, at: 451 }]), false,
    "a commit and a page blur before the step");
});

test("no witness of the same page: fail", () => {
  const trace = [commit, pageBlur];
  assert.equal(editorBlurBeforePress(before, undefined, trace, windowBlurred).redo, false);
  assert.equal(editorBlurBeforePress(before, { ...samePage, startedAt: 9_600 }, trace, windowBlurred).redo, false,
    "a new page document");
  assert.equal(editorBlurBeforePress({ ...before, clock: null }, samePage, trace, windowBlurred).redo, false);
  assert.equal(editorBlurBeforePress({ ...before, startedAt: null }, samePage, trace, windowBlurred).redo, false);
});
