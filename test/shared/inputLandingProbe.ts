/**
 * Where a real press landed (CR 330). Capture-phase recorders in the workbench document and in the
 * webview host frame keep one record per `pointerdown`, `mousedown` and `focusin`; this file only
 * formats what they read, so a failure message says whether a lost press hit the workbench (on which
 * element), the host frame, the content page or nothing. Pure and unit-tested in
 * test/build/inputLandingProbe.test.ts. The page side lives in
 * test/integration/realInput/clickRouting.ts and only records: it never clicks, focuses or stops an event.
 */

/** One recorded event. `at` is `Date.now()` (host and pages share the machine clock). */
export interface LandingRecord {
  at: number;
  type: string;
  target: string;
  x?: number;
  y?: number;
}

/** The records of one document, or the text of a failed read. */
export interface LandingSource {
  name: string;
  records: readonly LandingRecord[] | string;
}

/** The most records kept per document by the recorder, so a long scenario cannot grow it. */
export const LANDING_RECORD_LIMIT = 200;

function formatRecord(record: LandingRecord, origin: number): string {
  const point = record.x === undefined || record.y === undefined ? "" : ` @${Math.round(record.x)},${Math.round(record.y)}`;
  return `${record.at - origin} ${record.type} ${record.target}${point}`;
}

/**
 * One line per document: its records from `since` (host `Date.now()`) on, times relative to `origin`
 * (the scenario's start, same clock as its steps), the last `limit` ones.
 */
export function formatLandingRecords(sources: readonly LandingSource[], origin: number, since: number, limit = 40): string {
  const lines = sources.map((source) => {
    if (typeof source.records === "string") return `${source.name} [${source.records}]`;
    const kept = source.records.filter((record) => record.at >= since);
    const shown = kept.slice(-limit);
    const omitted = kept.length - shown.length;
    const body = shown.length === 0 ? "none" : shown.map((record) => formatRecord(record, origin)).join("; ");
    return `${source.name} [${omitted > 0 ? `${omitted} earlier omitted; ` : ""}${body}]`;
  });
  return "landing " + lines.join(" ");
}

/** The list-appearance marks of one page, on the scenario's clock, for the failure message. */
export function formatListMarks(marks: readonly { at: number; mark: string }[] | string, origin: number): string {
  if (typeof marks === "string") return `list marks [${marks}]`;
  return `list marks [${marks.length === 0 ? "none" : marks.map((entry) => `${entry.at - origin} ${entry.mark}`).join("; ")}]`;
}

/** Mouse move and over counts and the focus of one document, or why it could not be read. */
export interface HoverDocument {
  name: string;
  counts: { mousemove: number; mouseover: number; hasFocus: boolean } | string;
}

/** The hover diagnostics: per-document counters and focus, the window state, the mouse point used. */
export function formatHoverDiagnostics(
  documents: readonly HoverDocument[],
  windowState: { focused: boolean; active: boolean },
  point: { x: number; y: number } | undefined,
): string {
  const docs = documents.map((doc) => typeof doc.counts === "string"
    ? `${doc.name} [${doc.counts}]`
    : `${doc.name} [mousemove ${doc.counts.mousemove}, mouseover ${doc.counts.mouseover}, hasFocus ${String(doc.counts.hasFocus)}]`);
  const at = point === undefined ? "mouse point unknown" : `mouse point ${Math.round(point.x)},${Math.round(point.y)}`;
  return `hover counts ${docs.join(" ")}; window focused ${String(windowState.focused)} active ${String(windowState.active)}; ${at}`;
}

/** The failure message of a hover that never reached the page, with the diagnostics and the landing summary. */
export function formatHoverNeverReached(option: string, timeoutMs: number, diagnostics: string, landing: string): string {
  return `the hover on list option ${option} never reached the page within ${timeoutMs} ms (after one re-move); ${diagnostics}; ${landing}`;
}
