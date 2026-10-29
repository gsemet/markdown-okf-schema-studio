import * as assert from "node:assert/strict";
import { test } from "node:test";

import { undoOneStep, undoUntil, type UndoStepDriver } from "../shared/undoSteps";

/**
 * A text box in a VS Code webview: typing lands at once, while each undo key press only queues the
 * undo, which reaches the page later (the round trip through the extension host), in order. Time
 * passes while the harness waits: each poll of `waitFor` lands the oldest queued undo.
 */
function webviewTextBox(initial: string) {
  let value = initial;
  const history: string[] = [];
  let queued = 0;
  const landOne = (): void => {
    if (queued === 0) return;
    queued -= 1;
    const previous = history.pop();
    if (previous !== undefined) value = previous;
  };
  const driver: UndoStepDriver & { type(text: string): void; value(): string; landAll(): void } = {
    type(text: string): void {
      history.push(value);
      value += text;
    },
    async pressUndo(): Promise<void> {
      queued += 1;
    },
    read: async () => value,
    async waitFor(description, predicate) {
      for (let poll = 0; poll < 50; poll += 1) {
        if (await predicate()) return;
        landOne();
      }
      throw new Error(`Timed out waiting for ${description}.`);
    },
    value: () => value,
    landAll(): void {
      while (queued > 0) landOne();
    },
  };
  return driver;
}

test("blind undo presses leave undos in flight that erase the next typed keys (the stress failure)", async () => {
  const box = webviewTextBox("Second paragraph.");
  box.type("\n");
  box.type("/h2");
  // The old scenario: six presses, then a wait for the text it wanted, then typing.
  for (let step = 0; step < 6; step += 1) await box.pressUndo();
  await box.waitFor("undo back to the start", async () => box.value() === "Second paragraph.");
  box.type("\n/");
  box.type("tab");
  box.landAll();
  assert.equal(box.value(), "Second paragraph.", "the four late undos erased the typed /tab");
});

test("undoUntil sees each press land before the next key, so nothing is left in flight", async () => {
  const box = webviewTextBox("Second paragraph.");
  box.type("\n");
  box.type("/h2");
  assert.deepEqual(await undoUntil(box, "Second paragraph.", 6), ["Second paragraph.\n", "Second paragraph."]);
  box.type("\n/");
  box.type("tab");
  box.landAll();
  assert.equal(box.value(), "Second paragraph.\n/tab");
  // Already at the target: no press at all.
  assert.deepEqual(await undoUntil(box, "Second paragraph.\n/tab", 6), []);
});

test("undoOneStep returns the value after the press; a press without effect or a short budget fails explained", async () => {
  const box = webviewTextBox("a");
  box.type("b");
  box.type("c");
  assert.equal(await undoOneStep(box, "abc"), "ab");
  await assert.rejects(undoUntil(box, "zzz", 1),
    /1 undo step\(s\) did not bring the text box back to "zzz"; values after each step: \["a"\]/u);
  // Nothing left to undo: the press changes nothing, and the wait names the value it kept.
  await assert.rejects(undoOneStep(box, "a"), /Timed out waiting for one undo to change the text box from "a"\./u);
  const noBox: UndoStepDriver = { ...box, read: async () => undefined };
  await assert.rejects(undoUntil(noBox, "a", 3), /No text box has the focus/u);
});
