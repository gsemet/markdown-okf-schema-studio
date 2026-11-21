/**
 * Opening files in Studio, host side. This module holds the registry of the text editors Studio
 * opened itself (its own reveals, link navigation, "Open as Text"): the opening watcher never
 * replaces one of them by a Studio tab, or it would undo what Studio just did on purpose.
 * Pure data and a clock: no VS Code API.
 */

/** How long, in milliseconds, a text editor Studio opened stays recorded. */
const OPENED_BY_STUDIO_WINDOW_MS = 5000;

/** The URIs of the text editors Studio opened in the last few seconds. */
export class StudioOpenedTextEditors {
  private readonly recordedAt = new Map<string, number>();

  public constructor(private readonly now: () => number = Date.now) {}

  /** Records that Studio is about to open a text editor on `uri`. */
  public record(uri: string): void {
    const now = this.now();
    for (const [other, at] of this.recordedAt) {
      if (now - at > OPENED_BY_STUDIO_WINDOW_MS) this.recordedAt.delete(other);
    }
    this.recordedAt.set(uri, now);
  }

  /** True when Studio recorded `uri` within the window. */
  public has(uri: string): boolean {
    const at = this.recordedAt.get(uri);
    return at !== undefined && this.now() - at <= OPENED_BY_STUDIO_WINDOW_MS;
  }
}
