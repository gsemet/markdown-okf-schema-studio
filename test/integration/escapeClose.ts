/**
 * Closes a block editor with Escape. Escape unwinds one level at a time: inside the figure form, the
 * link panel or a popover it only returns to the text box, and a second Escape there cancels the
 * editor. Press until the editor is gone, at most `maxPresses` times, waiting `settle` after each.
 */
export async function escapeUntilClosed(
  press: () => Promise<void>,
  isOpen: () => Promise<boolean>,
  settle: () => Promise<void>,
  maxPresses = 3,
): Promise<number> {
  for (let presses = 1; presses <= maxPresses; presses += 1) {
    await press();
    await settle();
    if (!(await isOpen())) return presses;
  }
  return maxPresses;
}
