/**
 * Proof that a real-window step was interrupted from outside the product (CI rule 12): the page
 * that ran the step was replaced by a new page document the host did not load, or the VS Code
 * window lost the OS focus and the page recorded the blur. A scenario may redo a step only on such
 * a proof; without one the failure is the product's or the test's and must surface with its dump.
 *
 * Pure: the scenario reads the witnesses and the trace from the page and the host, this module
 * only decides.
 */

/** What the page reported at one moment (read in the page, see `pageDiagnostics.ts`). */
export interface PageWitness {
  /** Wall-clock start of the page script (`__studioDiagnostics.startedAt()`): the page document. */
  startedAt: number | null;
  /** Milliseconds since `startedAt` when read, on the clock of the trace's `at`. */
  clock: number | null;
  /** The render the page shows (`<html data-sphinx-preview-request-id>`). */
  requestId: string | null;
  /** `document.hasFocus()` when read. */
  pageFocus: boolean;
}

/** What the host saw during the step. */
export interface HostWitness {
  /** Page documents the host assigned (`htmlAssignments`) at the step's start and now. */
  pageLoadsBefore: number | undefined;
  pageLoadsNow: number | undefined;
  /** Host wall-clock time (`Date.now()`) of the step's start, the clock of `windowStates`. */
  stepStartedAt: number;
  /** The VS Code window focus changes the host recorded (`onDidChangeWindowState`), oldest first. */
  windowStates: readonly WindowState[];
}

/** One `onDidChangeWindowState` event, with the host time it arrived. */
export interface WindowState {
  at: number;
  focused: boolean;
}

/** One entry of the page's editor trace (`editorTrace.ts`). */
export interface TraceEntry {
  at: number;
  event: string;
  detail?: string;
}

/** The trace event of a window blur in the page (`pageDiagnostics.ts`). */
export const PAGE_BLUR = "page blur";

/** Whether the step may be redone, and why (or why not, for the failure message). */
export type StepVerdict = { redo: true; reason: string } | { redo: false; reason: string };

/**
 * Decides whether the step that started at `before` was interrupted from outside. `after` is the
 * page shown now (undefined: no page to read), `trace` its trace, `host` what the host saw.
 *
 * - A new page document is proof only when the host's page-load count is known and did not move:
 *   a page the host loaded itself is the product's doing.
 * - On the same page, a `page blur` after the start is proof only when the VS Code window itself
 *   lost the focus during the step (a page blur in a focused window is a focus move inside the
 *   workbench), and only when the page recorded no `closedBy` entry after the start (the page's
 *   own reason why the awaited state went, e.g. `comment popover closed`).
 * - A new request id on the same page document is a content update the page keeps its state
 *   through: no proof. Neither is a page whose start is unknown.
 *
 * The page trace keeps its last 40 entries: a `closedBy` entry (or a blur) pushed out of it is not
 * seen here, so a close the page recorded early in a long step may be missed.
 */
export function interruptionSince(
  before: PageWitness,
  after: PageWitness | undefined,
  trace: readonly TraceEntry[],
  host: HostWitness,
  closedBy?: string,
): StepVerdict {
  const no = (reason: string): StepVerdict => ({ redo: false, reason });
  if (before.startedAt === null || before.clock === null) return no("the page did not witness the step's start");
  if (after === undefined || after.startedAt === null) return no("no page to read now");
  if (after.startedAt !== before.startedAt) {
    const replaced = `page replaced (page started at ${before.startedAt}, request ${before.requestId}; `
      + `now a page started at ${after.startedAt}, request ${after.requestId})`;
    if (host.pageLoadsBefore === undefined || host.pageLoadsNow === undefined) {
      return no(`${replaced}, but the host's page loads are unknown`);
    }
    if (host.pageLoadsNow !== host.pageLoadsBefore) {
      return no(`${replaced} by the host itself (page loads ${host.pageLoadsBefore} -> ${host.pageLoadsNow})`);
    }
    return { redo: true, reason: `${replaced}, not by the host (page loads ${host.pageLoadsNow})` };
  }
  const since = trace.filter((entry) => entry.at >= before.clock!);
  const closed = closedBy === undefined ? undefined : since.find((entry) => entry.event === closedBy);
  if (closed !== undefined) {
    return no(`the page recorded "${closed.event}" at ${closed.at} ms${closed.detail === undefined ? "" : `: ${closed.detail}`}`);
  }
  const blur = since.find((entry) => entry.event === PAGE_BLUR);
  if (blur === undefined) return no(`no page blur since the step started at ${before.clock} ms`);
  const lost = host.windowStates.find((state) => state.at >= host.stepStartedAt && !state.focused);
  const blurred = `page blur at ${blur.at} ms (step started at ${before.clock} ms)`
    + (blur.detail === undefined ? "" : `: ${blur.detail}`);
  if (lost === undefined) return no(`${blurred}, but the VS Code window kept the focus (a focus move inside the workbench)`);
  return { redo: true, reason: `window blur: ${blurred}, and the VS Code window lost the focus at ${lost.at} (step started at ${host.stepStartedAt})` };
}
