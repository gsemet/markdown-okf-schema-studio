/**
 * Which frames of the workbench page can be the Studio frame, told from `url()` alone. In heavy CI
 * run 45706313890, attempt 2, a locator count on a frame with an empty URL did not return within its
 * 10 s bound. Such a frame has no webview address, so a frame is picked by its URL before any other
 * call on it.
 *
 * No vscode, no playwright: unit-testable with fake frames.
 */

interface UrlFrame {
  url(): string;
}

/** Why a frame with this URL cannot show a VS Code webview, or undefined when it can. */
export function frameUrlSkipReason(url: string): string | undefined {
  if (url === "") return "empty URL (no document committed)";
  if (url === "about:blank") return "about:blank";
  return url.startsWith("vscode-webview://") ? undefined : "not a vscode-webview:// URL";
}

/** The frames that can show a VS Code webview. */
export function webviewFrames<F extends UrlFrame>(frames: readonly F[]): F[] {
  return frames.filter((frame) => frameUrlSkipReason(frame.url()) === undefined);
}

/** One lookup: the frame it found, and a line per frame it looked at. */
export interface FrameScan<F> {
  readonly found: F | undefined;
  readonly seen: readonly string[];
}

/**
 * Looks for the first webview frame that `inspect` accepts. `inspect` answers why it rejects a frame,
 * or undefined for the wanted one; it is only given webview frames.
 */
export async function scanWebviewFrames<F extends UrlFrame>(
  frames: readonly F[],
  inspect: (frame: F) => Promise<string | undefined>,
): Promise<FrameScan<F>> {
  const seen: string[] = [];
  for (const frame of frames) {
    const url = frame.url();
    const line = JSON.stringify(url.slice(0, 160));
    const skipped = frameUrlSkipReason(url);
    if (skipped !== undefined) {
      seen.push(`${line} skipped: ${skipped}`);
      continue;
    }
    const rejected = await inspect(frame);
    seen.push(`${line} kept: ${rejected ?? "the current Studio frame"}`);
    if (rejected === undefined) return { found: frame, seen };
  }
  return { found: undefined, seen };
}

/** The last lookup that found nothing, so that a wait that times out can list what it saw. */
export class FrameLookupLog {
  private lookups = 0;
  private missed: { readonly lookup: number; readonly seen: readonly string[] } | undefined;

  /** The position of the log now: a wait takes it when it starts. */
  mark(): number {
    return this.lookups;
  }

  record(scan: FrameScan<unknown>): void {
    this.lookups += 1;
    this.missed = scan.found === undefined ? { lookup: this.lookups, seen: scan.seen } : undefined;
  }

  /** What to add to a timeout message: empty unless the last lookup since `mark` found nothing. */
  describeSince(mark: number): string {
    if (this.missed === undefined || this.missed.lookup <= mark) return "";
    return ` Frames of the last Studio frame lookup: ${this.missed.seen.join("; ") || "none"}.`;
  }
}
