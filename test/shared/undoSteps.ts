/**
 * Undo in a preview text box, one observed step at a time.
 *
 * In a VS Code webview, Cmd/Ctrl+Z does not undo in the page: the webview host cancels the key and
 * forwards it to the workbench, VS Code runs the key binding, and the extension sends the undo back
 * to the page (`previewEditCommand`, SwRS BLOCK-003). Each press is a round trip through the
 * extension host, so a key press returns long before its undo lands. A test that presses undo N
 * times and then waits for the text it wants can see that text while some of the N undos are still
 * on their way; those land on the keys typed next and erase them (CI stress, slash menu: Enter and
 * `/` typed after the undos were lost, the box read `Second paragraph.tab`).
 *
 * These helpers press once, then wait for the text box to show the effect of that press before the
 * next key: no undo is ever in flight when they return. Pure (unit-tested in
 * test/build/undoSteps.test.ts); the caller gives the key press, the read and the wait.
 */
export interface UndoStepDriver {
  /** Presses the undo key once. */
  pressUndo(): Promise<void>;
  /** The text box value now, or undefined when no text box has the focus. */
  read(): Promise<string | undefined>;
  /** Waits until `predicate` holds, or fails naming `description` (the harness `waitFor`). */
  waitFor(description: string, predicate: () => Promise<boolean>): Promise<void>;
}

/** Presses undo once and waits until the text box shows a value other than `before`; returns it. */
export async function undoOneStep(driver: UndoStepDriver, before: string): Promise<string> {
  await driver.pressUndo();
  let after: string | undefined;
  await driver.waitFor(`one undo to change the text box from ${JSON.stringify(before)}`, async () => {
    after = await driver.read();
    return after !== undefined && after !== before;
  });
  return after!;
}

/**
 * Presses undo one step at a time until the text box shows `target`, at most `maxSteps` presses,
 * each one seen before the next. Returns the values seen after each press. Fails when `target` is
 * not reached within `maxSteps`, with the values seen.
 */
export async function undoUntil(driver: UndoStepDriver, target: string, maxSteps: number): Promise<string[]> {
  const seen: string[] = [];
  let value = await driver.read();
  if (value === undefined) throw new Error("No text box has the focus to undo in.");
  for (let step = 0; step < maxSteps && value !== target; step += 1) {
    value = await undoOneStep(driver, value);
    seen.push(value);
  }
  if (value !== target) {
    throw new Error(`${maxSteps} undo step(s) did not bring the text box back to ${JSON.stringify(target)}; `
      + `values after each step: ${JSON.stringify(seen)}`);
  }
  return seen;
}
