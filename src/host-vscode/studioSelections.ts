/**
 * The selections Studio itself makes in a text editor, host side: "Open as Text" and a link followed
 * in the side preview. The jump signal reads them to tell Studio's own selection from a reader's
 * jump. Pure data and a clock: no VS Code API.
 */

/** How long, in milliseconds, a selection Studio asked for is expected (trial T2: it comes a few milliseconds after the editor shows). */
export const STUDIO_SELECTION_WINDOW_MS = 1000;

/** Why Studio is about to select a line: it needs no mark, or the session marks the line itself. */
export type StudioSelectionPurpose = "no-mark" | "marked-by-session";

// @implements_req SwRS-MDOKFSTUDIO-LIFE-186
/**
 * The selections Studio itself is about to make in a text editor ("Open as Text", a link followed
 * in the side preview), by URI and 0-based line. The jump signal drops a `Command` selection change
 * that matches one, once, within the window: Studio already handles it. A user's jump to the very
 * same line within the window is taken as Studio's own (stated in the SwRS). Pure data and a clock:
 * no VS Code API.
 */
export class StudioSelections {
  private readonly expected: { uri: string; line: number; purpose: StudioSelectionPurpose; at: number }[] = [];

  public constructor(private readonly now: () => number = Date.now) {}

  /** Records that Studio is about to open a text editor on `uri` with a selection on 0-based `line`. */
  public expect(uri: string, line: number, purpose: StudioSelectionPurpose): void {
    const now = this.now();
    this.prune(now);
    this.expected.push({ uri, line, purpose, at: now });
  }

  /** Returns, and removes, the expectation of `uri` and `line` inside the window; undefined when none matches. */
  public take(uri: string, line: number): StudioSelectionPurpose | undefined {
    const now = this.now();
    this.prune(now);
    const index = this.expected.findIndex((entry) => entry.uri === uri && entry.line === line);
    if (index < 0) return undefined;
    return this.expected.splice(index, 1)[0]!.purpose;
  }

  private prune(now: number): void {
    for (let index = this.expected.length - 1; index >= 0; index -= 1) {
      if (now - this.expected[index]!.at > STUDIO_SELECTION_WINDOW_MS) this.expected.splice(index, 1);
    }
  }
}
