/**
 * Opening files in Studio, host side. This module holds the registry of the text editors Studio
 * opened itself (its own reveals, link navigation, "Open as Text"): the opening watcher never
 * replaces one of them by a Studio tab, or it would undo what Studio just did on purpose.
 * Pure data and a clock: no VS Code API.
 */

import { PENDING_LINE_WINDOW_MS } from "../core/navigation/pendingLine";

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

/**
 * The lines Studio was asked to show: a line for a Studio tab that is about to open (recorded,
 * consumed once by the custom editor provider, dropped after a few seconds), and the way to give a
 * line to a Studio session that is already live. Pure data, a clock and a callback: no VS Code API.
 */
export class StudioLineRequests {
  private readonly pending = new Map<string, { line: number; at: number }>();
  private liveSessions: ((uri: string, line: number) => boolean) | undefined;

  public constructor(private readonly now: () => number = Date.now) {}

  /** Binds how a line reaches the live Studio sessions of a document; it answers whether one took it. */
  public bindLiveSessions(send: (uri: string, line: number) => boolean): void {
    this.liveSessions = send;
  }

  /** Records the line the Studio tab about to open for `uri` shows. */
  public recordPending(uri: string, line: number): void {
    const now = this.now();
    for (const [other, entry] of this.pending) {
      if (now - entry.at > PENDING_LINE_WINDOW_MS) this.pending.delete(other);
    }
    this.pending.set(uri, { line, at: now });
  }

  /** The recorded line of `uri` (once, and only inside the window), or undefined. */
  public takePending(uri: string): number | undefined {
    const entry = this.pending.get(uri);
    this.pending.delete(uri);
    return entry !== undefined && this.now() - entry.at <= PENDING_LINE_WINDOW_MS ? entry.line : undefined;
  }

  /** Gives `line` to a live Studio session of `uri`; when none takes it, records it as pending. */
  public deliver(uri: string, line: number): void {
    if (!this.liveSessions?.(uri, line)) this.recordPending(uri, line);
  }
}

/** How long, in milliseconds, a closed Studio tab marks a text tab opened right after it as reopened on purpose. */
const CLOSED_STUDIO_TAB_WINDOW_MS = 2000;

/**
 * The Studio tabs closed in the last moments, by file and group: a text tab of the same file opening
 * in the same group right after is the reader's "Reopen Editor With > Text Editor" (the signal is
 * unproved, trial T3). Pure data and a clock: no VS Code API.
 */
export class StudioClosedTabs {
  private readonly closedAt = new Map<string, number>();

  public constructor(private readonly now: () => number = Date.now) {}

  private static key(uri: string, viewColumn: number): string {
    return `${viewColumn}|${uri}`;
  }

  /** Records that a Studio tab of `uri` closed in group `viewColumn`. */
  public record(uri: string, viewColumn: number): void {
    const now = this.now();
    for (const [other, at] of this.closedAt) {
      if (now - at > CLOSED_STUDIO_TAB_WINDOW_MS) this.closedAt.delete(other);
    }
    this.closedAt.set(StudioClosedTabs.key(uri, viewColumn), now);
  }

  /** True when a Studio tab of `uri` closed in group `viewColumn` within the window. */
  public has(uri: string, viewColumn: number): boolean {
    const at = this.closedAt.get(StudioClosedTabs.key(uri, viewColumn));
    return at !== undefined && this.now() - at <= CLOSED_STUDIO_TAB_WINDOW_MS;
  }
}
