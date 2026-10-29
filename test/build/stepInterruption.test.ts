import * as assert from "node:assert/strict";
import { test } from "node:test";

import { type HostWitness, interruptionSince, PAGE_BLUR, type PageWitness } from "../shared/stepInterruption";

const before: PageWitness = { startedAt: 1_000, clock: 500, requestId: "4", pageFocus: true };
const samePage = (overrides: Partial<PageWitness> = {}): PageWitness => ({ ...before, clock: 900, ...overrides });
const newPage = samePage({ startedAt: 2_000, requestId: "5" });
const quiet: HostWitness = { pageLoadsBefore: 3, pageLoadsNow: 3, stepStartedAt: 10_000, windowStates: [] };
const windowBlurred: HostWitness = { ...quiet, windowStates: [{ at: 10_200, focused: false }, { at: 10_300, focused: true }] };
const CLOSED = "comment popover closed";

test("CR 186: a new page document the host did not load proves the interruption, whatever its trace says", () => {
  assert.deepEqual(interruptionSince(before, newPage, [{ at: 10, event: CLOSED }], quiet, CLOSED), {
    redo: true,
    reason: "page replaced (page started at 1000, request 4; now a page started at 2000, request 5), not by the host (page loads 3)",
  });
});

test("CR 186: a new page document the host loaded itself, or with unknown page loads, proves nothing", () => {
  const reloaded = interruptionSince(before, newPage, [], { ...windowBlurred, pageLoadsNow: 4 });
  assert.equal(reloaded.redo, false);
  assert.match(reloaded.reason, /by the host itself \(page loads 3 -> 4\)$/u);
  const unknown = interruptionSince(before, newPage, [], { ...quiet, pageLoadsBefore: undefined });
  assert.equal(unknown.redo, false);
  assert.match(unknown.reason, /the host's page loads are unknown$/u);
});

test("CR 186: a page blur after the start proves it only when the VS Code window lost the focus", () => {
  const trace = [
    { at: 120, event: PAGE_BLUR, detail: "before the step" },
    { at: 640, event: "page focus" },
    { at: 700, event: PAGE_BLUR, detail: "active=body pageFocus=false" },
  ];
  assert.deepEqual(interruptionSince(before, samePage({ pageFocus: false }), trace, windowBlurred), {
    redo: true,
    reason: "window blur: page blur at 700 ms (step started at 500 ms): active=body pageFocus=false, "
      + "and the VS Code window lost the focus at 10200 (step started at 10000)",
  });
  assert.equal(interruptionSince(before, samePage(), [{ at: 500, event: PAGE_BLUR }], windowBlurred).redo, true,
    "a blur at the start time counts");
  const inside = interruptionSince(before, samePage(), trace, quiet);
  assert.equal(inside.redo, false);
  assert.match(inside.reason, /the VS Code window kept the focus \(a focus move inside the workbench\)$/u);
  const earlier = { ...quiet, windowStates: [{ at: 9_900, focused: false }, { at: 10_500, focused: true }] };
  assert.equal(interruptionSince(before, samePage(), trace, earlier).redo, false,
    "a window focus loss before the step is not this step's interruption");
});

test("CR 186: nothing is proved without a blur after the start, on a new request id alone, or without witnesses", () => {
  const redo = (after: PageWitness | undefined, trace = [{ at: 600, event: PAGE_BLUR }], start = before): boolean =>
    interruptionSince(start, after, trace, windowBlurred).redo;
  assert.equal(redo(samePage(), []), false);
  assert.equal(redo(samePage(), [{ at: 499, event: PAGE_BLUR }]), false, "a blur before the step");
  assert.equal(redo(samePage({ requestId: "9" }), []), false, "a content update keeps the page");
  assert.equal(redo(undefined), false, "no page to read");
  assert.equal(redo(newPage, [], { ...before, startedAt: null }), false);
  assert.equal(redo(samePage(), undefined, { ...before, clock: null }), false);
  assert.equal(redo(samePage({ startedAt: null })), false);
});

test("CR 186: on the same page, a close the page recorded after the start outweighs a blur", () => {
  const trace = [{ at: 600, event: PAGE_BLUR }, { at: 650, event: CLOSED, detail: "pointerdown outside on p, thread t1" }];
  assert.deepEqual(interruptionSince(before, samePage(), trace, windowBlurred, CLOSED), {
    redo: false,
    reason: 'the page recorded "comment popover closed" at 650 ms: pointerdown outside on p, thread t1',
  });
  assert.equal(interruptionSince(before, samePage(), [{ at: 400, event: CLOSED }, trace[0]!], windowBlurred, CLOSED).redo,
    true, "a close before the step is not this step's answer");
});
