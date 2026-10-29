/**
 * The alert type pick probe (real-input scenario `alert-type-pick-probe`): after the Alert
 * button wrote `> [!NOTE]`, the type list is used the two ways a user can, with the keyboard
 * (ArrowDown, Enter in the text box) and with a real mouse press on an option. For each pick the
 * scenario records, on the page's clock from the pick on, the blur of the text box, the commits
 * and the close of the block editor, and the final Markdown of the file, and prints them in one
 * `ALERT-PICK-PROBE` line. The requirement it checks is the user-visible one: the chosen type is
 * in the document.
 *
 * Everything here is pure (unit-tested in test/build/alertPickProbe.test.ts).
 */

export type AlertPickMode = "keyboard" | "mouse";

/** One page trace entry (`window.__studioDiagnostics.trace()`); `at` on the page's clock. */
export interface AlertPickTraceEntry {
  at: number;
  event: string;
  detail?: string;
}

/**
 * One event the probe's own listeners saw in the content frame, page clock: `blur` (the text box
 * lost the focus; detail: related target and page focus), `input` (the text box's first line after
 * an input) or `mark` (a step of the scenario, such as the commit key).
 */
export interface AlertPickProbeEvent {
  at: number;
  kind: "blur" | "input" | "mark";
  detail: string;
}

export interface AlertPickRecord {
  mode: AlertPickMode;
  /** The alert type chosen, as written in `> [!TYPE]`. */
  chosen: string;
  /** Page clock of the pick's first key or mouse press; earlier events are left out. */
  pickAt: number | undefined;
  probeEvents: AlertPickProbeEvent[];
  trace: AlertPickTraceEntry[];
  /** The file's Markdown at the end of the pick (host document). */
  markdown: string;
  /** The paragraph the alert quotes, to cut the Markdown excerpt. */
  paragraph: string;
}

/** The events of one pick by kind, each `+<ms after the pick> <what>`. */
export interface AlertPickEvents {
  blur: string[];
  commit: string[];
  close: string[];
  choice: string[];
  marks: string[];
}

const since = (pickAt: number | undefined, at: number): string =>
  pickAt === undefined ? `@${Math.round(at)}ms` : `${at - pickAt >= 0 ? "+" : ""}${Math.round(at - pickAt)}ms`;

const entryText = (entry: AlertPickTraceEntry): string => entry.event + (entry.detail ? ` ${entry.detail}` : "");

/**
 * Sorts the pick's events: blur (the probe's text box blur, the page trace's `block editor blur`
 * and `page blur`), commit (`content patch`, the re-render after a save, and any trace entry that
 * says `commit`), close (`block editor closed`), the text box's alert head after each input, and
 * the scenario's marks. Events before the pick are left out (all kept when its time is unknown).
 */
export function alertPickEvents(record: AlertPickRecord): AlertPickEvents {
  const { pickAt } = record;
  const after = (at: number): boolean => pickAt === undefined || at >= pickAt;
  const result: AlertPickEvents = { blur: [], commit: [], close: [], choice: [], marks: [] };
  const timed: Array<{ at: number; list: keyof AlertPickEvents; text: string }> = [];
  for (const event of record.probeEvents) {
    if (!after(event.at)) continue;
    const list = event.kind === "blur" ? "blur" : event.kind === "input" ? "choice" : "marks";
    timed.push({ at: event.at, list, text: event.kind === "blur" ? `text box blur ${event.detail}` : event.detail });
  }
  for (const entry of record.trace) {
    if (!after(entry.at)) continue;
    const text = entryText(entry);
    if (entry.event === "block editor blur" || entry.event === "page blur") {
      timed.push({ at: entry.at, list: "blur", text });
    }
    if (entry.event === "content patch" || /\bcommit\b/u.test(entry.detail ?? "")) {
      timed.push({ at: entry.at, list: "commit", text });
    }
    if (entry.event === "block editor closed") timed.push({ at: entry.at, list: "close", text });
  }
  timed.sort((a, b) => a.at - b.at);
  for (const item of timed) result[item.list].push(`${since(pickAt, item.at)} ${item.text}`);
  return result;
}

/** The Markdown lines of the alert: the paragraph's line and the line above it. */
export function alertExcerpt(markdown: string, paragraph: string): string {
  const lines = markdown.split("\n");
  const index = lines.findIndex((line) => line.includes(paragraph));
  if (index < 0) return `(paragraph ${JSON.stringify(paragraph)} not found)`;
  return lines.slice(Math.max(0, index - 1), index + 1).join("\n");
}

/** True when the file holds the alert with the chosen type around the paragraph. */
export function alertPickApplied(markdown: string, chosen: string, paragraph: string): boolean {
  return markdown.split("\n").some((line, index, lines) =>
    line === `> [!${chosen}]` && lines[index + 1] === `> ${paragraph}`);
}

const list = (items: string[]): string => (items.length === 0 ? "none" : `[${items.join("; ")}]`);

/**
 * The probe's log line for one pick:
 * `ALERT-PICK-PROBE <mode>: chosen=.. applied=.. blur=[..] commit=[..] close=[..] choice=[..] marks=[..] markdown=".."`.
 */
export function formatAlertPickProbeLine(record: AlertPickRecord): string {
  const events = alertPickEvents(record);
  const applied = alertPickApplied(record.markdown, record.chosen, record.paragraph);
  return `ALERT-PICK-PROBE ${record.mode}: chosen=${record.chosen} applied=${applied}`
    + ` blur=${list(events.blur)} commit=${list(events.commit)} close=${list(events.close)}`
    + ` choice=${list(events.choice)} marks=${list(events.marks)}`
    + ` markdown=${JSON.stringify(alertExcerpt(record.markdown, record.paragraph))}`;
}
