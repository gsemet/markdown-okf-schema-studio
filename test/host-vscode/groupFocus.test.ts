import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createFocusWorkTracker, focusGroupCommand } from "../../src/host-vscode/groupFocus";

test("a group position that exists maps to its focus command", () => {
  assert.equal(focusGroupCommand(1, 2), "workbench.action.focusFirstEditorGroup");
  assert.equal(focusGroupCommand(2, 2), "workbench.action.focusSecondEditorGroup");
  assert.equal(focusGroupCommand(3, 3), "workbench.action.focusThirdEditorGroup");
});

test("a position past the last group gets no command, because the command would create a group", () => {
  // The user's group moved from position 3 to 2 when the empty preview group closed.
  assert.equal(focusGroupCommand(3, 2), undefined);
  assert.equal(focusGroupCommand(1, 0), undefined);
});

test("positions outside the supported range or not known get no command", () => {
  assert.equal(focusGroupCommand(undefined, 3), undefined);
  assert.equal(focusGroupCommand(0, 3), undefined);
  assert.equal(focusGroupCommand(9, 9), undefined);
  assert.equal(focusGroupCommand(1.5, 3), undefined);
});

test("CR 041: settled() waits for every tracked focus job, also one that starts while waiting", async () => {
  const tracker = createFocusWorkTracker(5, () => 0);
  const order: string[] = [];
  let finishFirst = (): void => undefined;
  tracker.track(new Promise<void>((resolve) => { finishFirst = resolve; }));
  assert.equal(tracker.pending(), 1);
  const waiting = tracker.settled().then(() => order.push("settled"));
  await Promise.resolve();
  let finishSecond = (): void => undefined;
  tracker.track(new Promise<void>((resolve) => { finishSecond = resolve; }));
  finishFirst();
  order.push("first done");
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(order, ["first done"], "the second job still runs");
  finishSecond();
  await waiting;
  assert.deepEqual(order, ["first done", "settled"]);
  assert.equal(tracker.pending(), 0);
});

test("CR 041: a failed focus job settles too; settled() with nothing pending resolves at once", async () => {
  const tracker = createFocusWorkTracker(5, () => 0);
  tracker.track(Promise.reject(new Error("command failed")));
  await tracker.settled();
  assert.equal(tracker.pending(), 0);
  await tracker.settled();
});

test("CR 041: the focus log keeps the last moves with their time, filtered by a start time", () => {
  let clock = 100;
  const tracker = createFocusWorkTracker(2, () => clock);
  tracker.record("workbench.action.focusFirstEditorGroup");
  clock = 200;
  tracker.record("workbench.action.focusSecondEditorGroup");
  clock = 300;
  tracker.record("workbench.action.focusFirstEditorGroup (restore)");
  assert.deepEqual(tracker.moves(), [
    { at: 200, command: "workbench.action.focusSecondEditorGroup" },
    { at: 300, command: "workbench.action.focusFirstEditorGroup (restore)" },
  ]);
  assert.deepEqual(tracker.moves(250).map((move) => move.at), [300]);
});
