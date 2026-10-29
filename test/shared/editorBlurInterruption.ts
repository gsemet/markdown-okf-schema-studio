/**
 * Proof that a press on a block-editor control never reached the page because the VS Code window
 * lost the OS focus first (CI rule 12): the window blur made the block editor commit and close
 * (commit on leave, SwRS-MDOKFSTUDIO-BLOCK-047) before the press, so the press found no editor.
 * Such a step may be redone once; any other failure is the product's or the test's.
 *
 * Pure, like stepInterruption.ts whose window-blur proof it builds on: the scenario reads the
 * witnesses and the trace, this module only decides.
 */

import {
  type HostWitness,
  interruptionSince,
  PAGE_BLUR,
  type PageWitness,
  type StepVerdict,
  type TraceEntry,
} from "./stepInterruption";

/** The trace event of a press that reached the page (`pageDiagnostics.ts`). */
export const PAGE_MOUSEDOWN = "mousedown";

/** The trace event of a window focus in the page (`pageDiagnostics.ts`). */
export const PAGE_FOCUS = "page focus";

/** The trace event of a blur of the block editor's text box (`blockSourceEditor.ts`). */
export const BLOCK_EDITOR_BLUR = "block editor blur";

/**
 * The detail of a block editor blur that committed with the focus going nowhere while the page had
 * already lost the focus: `related=none commit active=<tag> pageFocus=false` (`blockSourceEditor.ts`
 * with `traceFocus` of `pageDiagnostics.ts`). A window focus loss blurs the focused element first,
 * with `document.hasFocus()` already false, then the window, in the same task.
 */
const COMMIT_ON_WINDOW_BLUR = /^related=none commit active=\S+ pageFocus=false$/u;

/**
 * Most milliseconds from that commit to the `page blur` that follows it. Both are recorded in the
 * same task with the commit's save in between: a few ms, never the seconds of a later blur.
 */
export const COMMIT_TO_PAGE_BLUR_MS = 50;

/**
 * Most milliseconds between that page blur and the host's record of the VS Code window losing the
 * focus (`onDidChangeWindowState` with `focused: false`), either way. Both are wall-clock
 * `Date.now()` on one machine; the bound absorbs the IPC to the extension host under load. A window
 * loss seconds away is another event: the page blur was a focus move inside the workbench.
 */
export const WINDOW_BLUR_TO_PAGE_BLUR_MS = 1_000;

/**
 * Decides whether the press of the step that started at `before` was lost to a window blur.
 * `after` is the page shown now, `trace` its trace (oldest first), `host` what the host saw. A redo
 * needs all of:
 *
 * - the same page document (a window blur is proved only on the page that ran the step);
 * - no press (`mousedown`, whatever its target) recorded by the page since the start: a press
 *   that reached the page is the page's to handle, so its failure is not an interruption;
 * - a `block editor blur` since the start that committed with the focus going nowhere in a page
 *   that had already lost the focus (`related=none commit … pageFocus=false`);
 * - the next `page blur` after that commit in the trace, with no `page focus` between them, at most
 *   `COMMIT_TO_PAGE_BLUR_MS` after it: the window blur that made the editor commit;
 * - a host record of the VS Code window losing the focus within `WINDOW_BLUR_TO_PAGE_BLUR_MS` of
 *   that page blur (its wall-clock time is `before.startedAt` plus its `at`): the window loss that
 *   made the page blur, not one at another time of the step;
 * - the window blur proof of `interruptionSince` on that page blur and that window loss: the VS
 *   Code window lost the focus during the step.
 *
 * The page trace keeps its last 40 entries: a press pushed out of it is not seen here.
 */
export function editorBlurBeforePress(
  before: PageWitness,
  after: PageWitness | undefined,
  trace: readonly TraceEntry[],
  host: HostWitness,
): StepVerdict {
  const no = (reason: string): StepVerdict => ({ redo: false, reason });
  if (before.startedAt === null || before.clock === null) return no("the page did not witness the step's start");
  if (after === undefined || after.startedAt !== before.startedAt) {
    return no("the page that ran the step is gone or unreadable: a window blur is proved only on that page");
  }
  const start = before.clock;
  const since = trace.filter((entry) => entry.at >= start);
  const press = since.find((entry) => entry.event === PAGE_MOUSEDOWN);
  if (press !== undefined) {
    return no(`a press reached the page at ${press.at} ms${press.detail === undefined ? "" : `: ${press.detail}`}`);
  }
  const commits = since.filter((entry) =>
    entry.event === BLOCK_EDITOR_BLUR && /(^| )commit( |$)/u.test(entry.detail ?? ""));
  if (commits.length === 0) return no(`no block editor commit on blur since the step started at ${start} ms`);
  const rejected: string[] = [];
  for (const commit of commits) {
    const described = `commit at ${commit.at} ms (${commit.detail ?? "no detail"})`;
    if (!COMMIT_ON_WINDOW_BLUR.test(commit.detail ?? "")) {
      rejected.push(`${described}: not a blur to nowhere in a page that had lost the focus`);
      continue;
    }
    const following = since.slice(since.indexOf(commit) + 1);
    const next = following.find((entry) => entry.event === PAGE_BLUR || entry.event === PAGE_FOCUS);
    if (next === undefined || next.event !== PAGE_BLUR) {
      const why = next === undefined ? "no page blur after it" : `a page focus at ${next.at} ms first`;
      rejected.push(`${described}: ${why}`);
      continue;
    }
    if (next.at - commit.at > COMMIT_TO_PAGE_BLUR_MS) {
      rejected.push(`${described}: the next page blur came ${next.at - commit.at} ms later`);
      continue;
    }
    let proofHost = host;
    let bound = "";
    // The window losses of the step (one before it is no proof, see `interruptionSince`).
    const losses = host.windowStates.filter((state) => !state.focused && state.at >= host.stepStartedAt);
    if (losses.length > 0) {
      const blurAt = before.startedAt + next.at;
      const offset = (state: { at: number }): number => state.at - blurAt;
      const nearest = losses.reduce((best, state) =>
        Math.abs(offset(state)) < Math.abs(offset(best)) ? state : best);
      if (Math.abs(offset(nearest)) > WINDOW_BLUR_TO_PAGE_BLUR_MS) {
        rejected.push(`${described}: its page blur at ${next.at} ms (${blurAt} wall clock) is `
          + `${offset(nearest)} ms from the nearest VS Code window focus loss (at ${nearest.at}), `
          + `more than ${WINDOW_BLUR_TO_PAGE_BLUR_MS} ms: a focus move inside the workbench`);
        continue;
      }
      proofHost = { ...host, windowStates: [nearest] };
      bound = `, ${offset(nearest)} ms from the page blur`;
    }
    // The window proof on this page blur and this window loss only: the trace from it on.
    const verdict = interruptionSince(before, after, following.slice(following.indexOf(next)), proofHost);
    if (!verdict.redo) return verdict;
    return {
      redo: true,
      reason: `${verdict.reason}${bound}; the block editor committed on it at ${commit.at} ms (${commit.detail}) `
        + "and no press reached the page",
    };
  }
  return no(`no block editor commit on a window blur since the step started at ${start} ms: ${rejected.join("; ")}`);
}
