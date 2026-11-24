/** How long, in milliseconds, a requested line waits for the page that shows it (the side preview, a Studio tab). */
export const PENDING_LINE_WINDOW_MS = 5000;

/** Gives a line to a live Studio session of a document, in the group `column` when known; answers whether one took it. */
export type LiveLineSender = (uri: string, line: number, column?: number) => boolean;

// @implements_req SwRS-MDOKFSTUDIO-LIFE-181
/**
 * The line hand-off to a Studio tab: a line for a Studio tab that is about to open (recorded by
 * URI, taken once by the custom editor provider, dropped past the window), and the way to give a
 * line to a Studio session that is already live. A pending line is removed as soon as it is
 * delivered, so a later unrelated opening of the file cannot pick it up. Pure data, a clock and a
 * callback: no host API.
 */
export class PendingLines {
  private readonly pending = new Map<string, { line: number; at: number }>();
  private liveSessions: LiveLineSender | undefined;

  public constructor(private readonly now: () => number = Date.now) {}

  /** Binds how a line reaches the live Studio sessions of a document. */
  public bindLiveSessions(send: LiveLineSender): void {
    this.liveSessions = send;
  }

  /** Records the line the Studio tab about to open for `uri` shows; a second request replaces the first. */
  public record(uri: string, line: number): void {
    const now = this.now();
    for (const [other, entry] of this.pending) {
      if (now - entry.at > PENDING_LINE_WINDOW_MS) this.pending.delete(other);
    }
    this.pending.set(uri, { line, at: now });
  }

  /** The recorded line of `uri`, removed at once; undefined when none, or when it is past the window. */
  public take(uri: string): number | undefined {
    const entry = this.pending.get(uri);
    this.pending.delete(uri);
    return entry !== undefined && this.now() - entry.at <= PENDING_LINE_WINDOW_MS ? entry.line : undefined;
  }

  /** True while a line of `uri` is recorded and inside the window. */
  public has(uri: string): boolean {
    const entry = this.pending.get(uri);
    return entry !== undefined && this.now() - entry.at <= PENDING_LINE_WINDOW_MS;
  }

  /** Forgets the recorded line of `uri` (a text editor opened, or the open failed). */
  public drop(uri: string): void {
    this.pending.delete(uri);
  }

  /** Gives `line` to a live Studio session of `uri`; when none takes it, records it as pending. */
  public deliver(uri: string, line: number, column?: number): void {
    if (this.liveSessions?.(uri, line, column)) {
      this.pending.delete(uri);
      return;
    }
    this.record(uri, line);
  }
}
