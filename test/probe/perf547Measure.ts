/**
 * The measure of `perf-547` on an open preview page: real mouse input through Playwright, times
 * taken inside the preview frame (one clock) and Chromium traces for what the frame cannot see.
 * It knows nothing of VS Code: it needs the browser, the page that receives the mouse and the
 * frame that shows the preview of the `perf547Document` document.
 *
 * Three phases, in this order:
 *
 * 1. selection: drags over running text and across table cells, in turn. `selectionRelease` is the
 *    time from the mouse release to the frame after the Comment button is shown. A light trace
 *    (tasks and marks only) gives the longest main-thread task of each drag and of each release;
 * 2. comment creation, with no trace: `commentCreate` is the time from the click on Save to the
 *    frame after the new highlight is drawn and the box is gone (the host writes the sidecar and
 *    posts the threads in between);
 * 3. restyle: a few more comment creations under a timeline trace, which counts the elements the
 *    preview frame restyles from the click on Save until 1 s after the highlight is drawn.
 *
 * Every creation adds a thread: the document starts each run with the same threads and ends with
 * `CREATE_SAMPLES + RESTYLE_SAMPLES` more. It sets no limit; it fails only when what it measures
 * did not happen (no selection, no button, no highlight, an empty trace).
 */

import * as assert from "node:assert/strict";
import type { Browser, Frame, Page } from "playwright-core";

/** Drags of each kind (running text, table cells) in the selection phase. */
const SELECTIONS_PER_KIND = 7;
/** Timed comment creations. */
const CREATE_SAMPLES = 9;
/** Comment creations under the timeline trace, for the restyled elements. */
const RESTYLE_SAMPLES = 3;
const DRAG_MOVES = 40;
const DRAG_PAUSE_MS = 30;
/** The short drag that selects the words a new comment is about. */
const COMMENT_DRAG_MOVES = 10;
const COMMENT_DRAG_PAUSE_MS = 15;
const SCROLL_SETTLE_MS = 400;
/**
 * The wait after the highlight of a new comment: what the host does later for the same comment (a
 * second post of the threads when it sees the sidecar change) still counts for it.
 */
const CREATION_TAIL_MS = 1_000;
const PAGE_TIMEOUT_MS = 20_000;
const TASK_TRACE = ["toplevel", "blink.user_timing"];
const TIMELINE_TRACE = ["devtools.timeline", "disabled-by-default-devtools.timeline", "toplevel", "blink.user_timing"];
const TASK_NAMES = new Set(["RunTask", "ThreadControllerImpl::RunTask"]);

const SELECTORS = {
  button: "[data-okf-comment-create]",
  box: "[data-okf-comment-compose]",
  input: "[data-okf-comment-compose-input]",
  save: "[data-okf-comment-compose-save]",
  highlight: "mark[data-okf-comment-thread]",
  badge: "[data-okf-comment-badge]",
};

type TargetKind = "text" | "cells";

export interface Series {
  readonly unit: "ms" | "elements";
  readonly samples: number[];
  readonly median: number;
}

export interface DocumentCounts {
  readonly tables: number;
  readonly rows: number;
  readonly images: number;
  /** Images drawn at the width of the charts. */
  readonly imagesLoaded: number;
  /** Threads shown as a highlight or as a badge. */
  readonly threads: number;
  readonly highlights: number;
  readonly orphans: number;
  readonly elements: number;
}

export interface Perf547Measures {
  readonly viewport: { width: number; height: number };
  readonly interactions: {
    readonly selectionRelease: Series;
    readonly commentCreate: Series;
    readonly dragTextLongestTask: Series;
    readonly dragCellsLongestTask: Series;
    readonly releaseTextLongestTask: Series;
    readonly releaseCellsLongestTask: Series;
  };
  /** Per creation: all elements restyled, and (`largestRecalc`) those of its largest style pass. */
  readonly commentCreateRestyledElements: Series & { readonly largestRecalc: number[] };
  readonly threads: { readonly before: number; readonly after: number };
}

export function median(samples: readonly number[]): number {
  assert.ok(samples.length > 0, "a median needs a sample");
  const sorted = [...samples].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return round(sorted.length % 2 === 1 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function series(unit: Series["unit"], samples: number[]): Series {
  return { unit, samples, median: median(samples) };
}

const wait = (milliseconds: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, milliseconds));

// Functions below this line that take no Playwright object run in the preview frame: they are
// sent there as source text, so each one uses only its arguments and the page.

interface PageProbe {
  pressed?: { x: number; y: number };
  pending?: Promise<number>;
  arm(kind: "release" | "create", label: string): void;
}

function installPageProbe({ selectors, timeoutMs }: { selectors: typeof SELECTORS; timeoutMs: number }): void {
  const target = window as unknown as { __perf547?: PageProbe };
  if (target.__perf547) return;
  const shown = (): number => document.querySelectorAll(`${selectors.highlight}, ${selectors.badge}`).length;
  const probe: PageProbe = {
    arm(kind, label) {
      const before = shown();
      const type = kind === "release" ? "mouseup" : "click";
      const holds = kind === "release"
        ? (): boolean => document.querySelector(selectors.button) !== null
        : (): boolean => document.querySelector(selectors.box) === null && shown() > before;
      const pending = new Promise<number>((resolve, reject) => {
        let start: number | undefined;
        let finished = false;
        const check = (): void => {
          if (start === undefined || finished || !holds()) return;
          finished = true;
          stop();
          // The frame that draws what appeared, then the first task after it.
          requestAnimationFrame(() => setTimeout(() => {
            performance.mark(`perf547:${label}:done`);
            resolve(performance.now() - start!);
          }, 0));
        };
        // A capture listener of the window runs before the page's own listeners of the document.
        const input = (event: Event): void => {
          if (start !== undefined) return;
          if (kind === "create" && !(event.target as Element).closest(selectors.save)) return;
          start = event.timeStamp;
          performance.mark(`perf547:${label}:input`);
          setTimeout(check, 0);
        };
        const observer = new MutationObserver(check);
        const timer = setTimeout(() => {
          stop();
          reject(new Error(`${label}: ${start === undefined ? `no ${type} reached the page`
            : kind === "release" ? "no Comment button after the release" : "no new highlight after Save"}`));
        }, timeoutMs);
        function stop(): void {
          observer.disconnect();
          window.removeEventListener(type, input, true);
          clearTimeout(timer);
        }
        observer.observe(document.body, { childList: true, subtree: true });
        window.addEventListener(type, input, true);
        performance.mark(`perf547:${label}:start`);
      });
      pending.catch(() => undefined);
      probe.pending = pending;
    },
  };
  window.addEventListener("mousedown", (event) => { probe.pressed = { x: event.clientX, y: event.clientY }; }, true);
  target.__perf547 = probe;
}

function countDocument(selectors: typeof SELECTORS): DocumentCounts {
  const content = document.getElementById("sphinx-myst-preview-content")!;
  const tables = [...content.querySelectorAll("table")].filter((table) => !table.closest("[data-okf-properties]"));
  const images = [...content.querySelectorAll("img")];
  const highlights = [...document.querySelectorAll(selectors.highlight)];
  const ids = new Set([
    ...highlights.map((mark) => mark.getAttribute("data-okf-comment-thread")),
    ...[...document.querySelectorAll(selectors.badge)].map((badge) => badge.getAttribute("data-okf-comment-badge")),
  ]);
  return {
    tables: tables.length,
    rows: tables.reduce((count, table) => count + table.rows.length, 0),
    images: images.length,
    imagesLoaded: images.filter((image) => image.complete && image.naturalWidth === 1100).length,
    threads: ids.size,
    highlights: highlights.length,
    orphans: document.querySelectorAll("[data-okf-comment-orphan]").length,
    elements: document.getElementsByTagName("*").length,
  };
}

interface Point {
  readonly x: number;
  readonly y: number;
}

interface DragPoints {
  readonly from: Point;
  readonly to: Point;
}

/**
 * Where to press and release, in frame coordinates. `select` drags over a section's whole
 * paragraph, or from the first cell of a row into the fourth cell up to two rows below (as many as
 * the frame shows at once); `comment` drags over a few words of one text node that no earlier
 * comment marks. With `scroll`, the two ends are first brought to the middle of the frame.
 */
function dragTarget(request: { kind: TargetKind; purpose: "select" | "comment"; index: number; scroll: boolean }):
  DragPoints | { problem: string } {
  const content = document.getElementById("sphinx-myst-preview-content")!;
  const { kind, purpose, index, scroll } = request;
  type Place = { node: Text; offset: number };
  const textsOf = (element: Element | undefined): Text[] => [...element?.childNodes ?? []]
    .filter((node): node is Text => node.nodeType === 3 && (node.nodeValue ?? "").trim() !== "");
  const rectOf = (place: Place): DOMRect | undefined => {
    const range = document.createRange();
    range.setStart(place.node, place.offset);
    range.setEnd(place.node, place.offset + 1);
    return range.getClientRects()[0];
  };
  const heightOf = (a: Place, b: Place): number => (rectOf(b)?.bottom ?? 0) - (rectOf(a)?.top ?? 0);
  let from: Place;
  let to: Place;
  if (kind === "text") {
    const paragraphs = [...content.querySelectorAll("p")].filter((paragraph) =>
      !paragraph.closest("table, blockquote, li, [data-okf-properties]") && (paragraph.textContent ?? "").length > 200);
    const texts = textsOf(paragraphs[index % paragraphs.length]);
    const first = texts[0];
    const last = texts[texts.length - 1];
    if (!first || !last) return { problem: "no long paragraph in the document" };
    // The last text node starts with the words after the inline code: " inline. " and a sentence.
    from = purpose === "select" ? { node: first, offset: 0 } : { node: last, offset: 10 };
    to = purpose === "select" ? { node: last, offset: last.length - 2 } : { node: last, offset: 29 };
  } else {
    const tables = [...content.querySelectorAll("table")].filter((table) => !table.closest("[data-okf-properties]"));
    const rows = tables[index % tables.length]?.rows;
    // The comment threads of the document are in the first four body rows: a new one goes below.
    const row = purpose === "select" ? 2 : 5;
    const first = textsOf(rows?.[row]?.cells[purpose === "select" ? 0 : 3])[0];
    if (!rows || !first) return { problem: `table ${index} has no text in row ${row}` };
    from = { node: first, offset: 0 };
    let endRow = purpose === "select" ? Math.min(row + 2, rows.length - 1) : row;
    const endIn = (at: number): Place | undefined => {
      const node = textsOf(rows[at]?.cells[3])[0];
      return node ? { node, offset: purpose === "select" ? 8 : 19 } : undefined;
    };
    let end = endIn(endRow);
    while (end && endRow > row && heightOf(from, end) > window.innerHeight * 0.8) end = endIn(--endRow);
    if (!end) return { problem: `table ${index}, row ${endRow}: a cell without text` };
    to = end;
  }
  if (scroll) {
    const middle = ((rectOf(from)?.top ?? 0) + (rectOf(to)?.bottom ?? 0)) / 2;
    window.scrollBy({ top: middle - window.innerHeight / 2, behavior: "instant" });
  }
  const pointOf = (place: Place, side: "left" | "right"): Point | string => {
    const rect = rectOf(place);
    if (!rect) return "a character with no box";
    const x = side === "left" ? rect.left + 1 : rect.right - 1;
    const y = rect.top + rect.height / 2;
    if (x < 0 || y < 0 || x >= window.innerWidth || y >= window.innerHeight) {
      return `a point at ${Math.round(x)},${Math.round(y)}, outside the ${window.innerWidth} x ${window.innerHeight} frame`;
    }
    const hit = document.elementFromPoint(x, y);
    if (hit !== place.node.parentElement) return `a point covered by <${hit?.tagName.toLowerCase() ?? "nothing"}>`;
    return { x, y };
  };
  const press = pointOf(from, "left");
  const release = pointOf(to, "right");
  if (typeof press === "string") return { problem: `${kind} ${index}: the start is ${press}` };
  if (typeof release === "string") return { problem: `${kind} ${index}: the end is ${release}` };
  return { from: press, to: release };
}

function readSelection(): { characters: number; oneTextNode: boolean; acrossCells: boolean } {
  const selection = window.getSelection()!;
  const cellOf = (node: Node | null): Element | null | undefined =>
    (node?.nodeType === 3 ? node.parentElement : node as Element | null)?.closest("td, th");
  const first = cellOf(selection.anchorNode);
  const last = cellOf(selection.focusNode);
  return {
    characters: selection.toString().length,
    oneTextNode: selection.anchorNode === selection.focusNode,
    acrossCells: !!first && !!last && first !== last,
  };
}

// The measure itself.

export async function readDocumentCounts(frame: Frame): Promise<DocumentCounts> {
  return frame.evaluate(countDocument, SELECTORS);
}

/** The points of a drag, read until the page stays still: the editor's scroll sync may follow a scroll. */
async function steadyTarget(frame: Frame, kind: TargetKind, purpose: "select" | "comment", index: number): Promise<DragPoints> {
  let previous = "";
  let found = await frame.evaluate(dragTarget, { kind, purpose, index, scroll: true });
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await wait(attempt === 0 ? SCROLL_SETTLE_MS : 200);
    found = await frame.evaluate(dragTarget, { kind, purpose, index, scroll: false });
    const now = JSON.stringify(found);
    if (now === previous && !("problem" in found)) return found;
    if (now === previous) break;
    previous = now;
  }
  throw new Error(`no drag target: ${"problem" in found ? found.problem : "the page does not stay still"}`);
}

async function clearSelection(frame: Frame): Promise<void> {
  await frame.evaluate(() => window.getSelection()?.removeAllRanges());
  await frame.waitForFunction((button) => document.querySelector(button) === null, SELECTORS.button,
    { timeout: PAGE_TIMEOUT_MS });
}

/** A real drag from one point of the frame to another; returns the ms from the release to the button. */
async function drag(
  page: Page, frame: Frame, points: DragPoints, label: string, moves: number, pauseMs: number,
): Promise<number> {
  const box = await (await frame.frameElement()).boundingBox();
  assert.ok(box, "the preview frame is visible");
  const { from, to } = points;
  await page.mouse.move(box.x + from.x, box.y + from.y);
  await frame.evaluate((name) => (window as unknown as { __perf547: PageProbe }).__perf547.arm("release", name), label);
  await page.mouse.down();
  for (let step = 1; step <= moves; step += 1) {
    await page.mouse.move(box.x + from.x + ((to.x - from.x) * step) / moves, box.y + from.y + ((to.y - from.y) * step) / moves);
    await wait(pauseMs);
  }
  await page.mouse.up();
  try {
    const elapsed = await frame.evaluate(() => (window as unknown as { __perf547: PageProbe }).__perf547.pending!);
    const pressed = await frame.evaluate(() => (window as unknown as { __perf547: PageProbe }).__perf547.pressed);
    assert.ok(pressed && Math.abs(pressed.x - from.x) <= 2 && Math.abs(pressed.y - from.y) <= 2,
      `${label}: the press reached the page at ${JSON.stringify(pressed)}, not at ${JSON.stringify(from)}`);
    return round(elapsed);
  } catch (error) {
    const state = await frame.evaluate(() => (window as unknown as { __perf547: PageProbe }).__perf547.pressed);
    throw new Error(`${error instanceof Error ? error.message : String(error)} (drag from ${JSON.stringify(from)} to `
      + `${JSON.stringify(to)}, press seen at ${JSON.stringify(state)}, selection `
      + `${JSON.stringify(await frame.evaluate(readSelection))})`, { cause: error });
  }
}

/** Selects a few words, opens the box with the Comment button, types and saves: ms from Save to the highlight. */
async function createComment(page: Page, frame: Frame, label: string, index: number): Promise<number> {
  const kind: TargetKind = index % 2 === 0 ? "text" : "cells";
  await clearSelection(frame);
  const points = await steadyTarget(frame, kind, "comment", index);
  await drag(page, frame, points, `${label}-select`, COMMENT_DRAG_MOVES, COMMENT_DRAG_PAUSE_MS);
  const selected = await frame.evaluate(readSelection);
  assert.ok(selected.oneTextNode && selected.characters >= 5,
    `${label}: a few words of one text node are selected: ${JSON.stringify(selected)}`);
  const before = await readDocumentCounts(frame);
  await frame.locator(SELECTORS.button).click();
  await frame.locator(SELECTORS.input).fill(`Lorem ipsum review comment ${label}.`);
  await wait(200);
  await frame.evaluate((name) => (window as unknown as { __perf547: PageProbe }).__perf547.arm("create", name), label);
  await frame.locator(SELECTORS.save).click();
  const elapsed = await frame.evaluate(() => (window as unknown as { __perf547: PageProbe }).__perf547.pending!);
  await wait(CREATION_TAIL_MS);
  await frame.evaluate((name) => performance.mark(`perf547:${name}:end`), label);
  const after = await readDocumentCounts(frame);
  assert.deepEqual([after.threads, after.highlights], [before.threads + 1, before.highlights + 1],
    `${label}: the new comment is drawn as a highlight`);
  return round(elapsed);
}

interface TraceSlice {
  readonly name: string;
  readonly thread: string;
  readonly ts: number;
  readonly dur: number;
  readonly args: { elementCount?: number; endData?: { elementCount?: number }; beginData?: { frame?: string } };
}

interface Trace {
  readonly slices: TraceSlice[];
  /** The `performance.mark`s of this measure, by name; times are in microseconds. */
  readonly marks: Map<string, { thread: string; ts: number }>;
}

interface TraceEvent {
  name: string;
  cat?: string;
  ph: string;
  pid: number;
  tid: number;
  ts: number;
  dur?: number;
  args?: TraceSlice["args"];
}

function parseTrace(buffer: Buffer): Trace {
  const events = (JSON.parse(buffer.toString("utf8")) as { traceEvents: TraceEvent[] }).traceEvents;
  const slices: TraceSlice[] = [];
  const marks: Trace["marks"] = new Map();
  const open = new Map<string, TraceEvent[]>();
  for (const event of [...events].sort((a, b) => a.ts - b.ts)) {
    const thread = `${event.pid}:${event.tid}`;
    if (event.name.startsWith("perf547:") && event.cat?.includes("blink.user_timing")) {
      marks.set(event.name, { thread, ts: event.ts });
    } else if (event.ph === "X") {
      slices.push({ name: event.name, thread, ts: event.ts, dur: event.dur ?? 0, args: event.args ?? {} });
    } else if (event.ph === "B") {
      const key = `${thread} ${event.name}`;
      open.set(key, [...(open.get(key) ?? []), event]);
    } else if (event.ph === "E") {
      const begin = open.get(`${thread} ${event.name}`)?.pop();
      if (begin) {
        slices.push({ name: begin.name, thread, ts: begin.ts, dur: event.ts - begin.ts, args: { ...begin.args, ...event.args } });
      }
    }
  }
  return { slices, marks };
}

function markOf(trace: Trace, label: string, point: string): { thread: string; ts: number } {
  const mark = trace.marks.get(`perf547:${label}:${point}`);
  assert.ok(mark, `the trace holds the mark perf547:${label}:${point} (${trace.marks.size} marks, ${trace.slices.length} slices)`);
  return mark;
}

/**
 * The longest main-thread task (ms) of a drag and of its release. The release is the task that
 * received the `mouseup` and the ones after it until the button was drawn; the drag is every task
 * between the arming of the probe and that task.
 */
function longestTasks(trace: Trace, label: string): { drag: number; release: number } {
  const start = markOf(trace, label, "start");
  const input = markOf(trace, label, "input");
  const done = markOf(trace, label, "done");
  const tasks = trace.slices.filter((slice) => slice.thread === input.thread && TASK_NAMES.has(slice.name));
  const releaseStart = Math.min(...tasks.filter((task) => task.ts <= input.ts && input.ts <= task.ts + task.dur)
    .map((task) => task.ts));
  const longest = (from: number, to: number, what: string): number => {
    const durations = tasks.filter((task) => task.ts >= from && task.ts < to).map((task) => task.dur);
    assert.ok(durations.length > 0 && Number.isFinite(releaseStart), `${label}: the trace holds the tasks of the ${what}`);
    return round(Math.max(...durations) / 1000);
  };
  return { drag: longest(start.ts, releaseStart, "drag"), release: longest(releaseStart, done.ts, "release") };
}

/** The elements the preview frame restyled between the click on Save and the end mark of a creation. */
function restyled(trace: Trace, frameId: string, label: string): { total: number; largest: number } {
  const input = markOf(trace, label, "input");
  const end = markOf(trace, label, "end");
  const counts = trace.slices
    .filter((slice) => slice.name === "UpdateLayoutTree" && slice.thread === input.thread
      && slice.args.beginData?.frame === frameId && slice.ts >= input.ts && slice.ts <= end.ts)
    .map((slice) => slice.args.elementCount ?? slice.args.endData?.elementCount);
  assert.ok(counts.length > 0 && counts.every((count) => typeof count === "number"),
    `${label}: the trace holds the style passes of the preview with their element counts: ${JSON.stringify(counts)}`);
  const numbers = counts as number[];
  return { total: numbers.reduce((sum, count) => sum + count, 0), largest: Math.max(...numbers) };
}

/**
 * The trace's name of the preview frame, which may share its main thread with other frames: the
 * frame of the style pass forced here, between two marks.
 */
function previewFrameId(trace: Trace): string {
  const start = markOf(trace, "frame", "start");
  const end = markOf(trace, "frame", "end");
  const id = trace.slices.find((slice) => slice.name === "UpdateLayoutTree" && slice.thread === start.thread
    && slice.ts >= start.ts && slice.ts <= end.ts)?.args.beginData?.frame;
  assert.ok(id, "the trace names the frame of a style pass of the preview");
  return id;
}

function forceStylePass(): void {
  performance.mark("perf547:frame:start");
  document.documentElement.style.setProperty("--perf547-frame", "1");
  void getComputedStyle(document.body).color;
  performance.mark("perf547:frame:end");
  document.documentElement.style.removeProperty("--perf547-frame");
}

/** Runs `action` under a Chromium trace of the given categories and returns the parsed trace. */
async function traced(browser: Browser, page: Page, categories: string[], action: () => Promise<void>): Promise<Trace> {
  await browser.startTracing(page, { categories });
  let buffer: Buffer | undefined;
  try {
    await action();
  } finally {
    // A trace left running would break the next one; the error of `action` is the one reported.
    buffer = await browser.stopTracing();
  }
  return parseTrace(buffer);
}

export async function measurePerf547(
  browser: Browser, page: Page, frame: Frame, log: (line: string) => void,
): Promise<Perf547Measures> {
  await frame.evaluate(installPageProbe, { selectors: SELECTORS, timeoutMs: PAGE_TIMEOUT_MS });
  const viewport = await frame.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }));
  const before = (await readDocumentCounts(frame)).threads;

  // One drag that is not a sample: it gives the preview the focus and warms the path up.
  await clearSelection(frame);
  await drag(page, frame, await steadyTarget(frame, "text", "select", SELECTIONS_PER_KIND), "warm-up", DRAG_MOVES,
    DRAG_PAUSE_MS);

  const releases: number[] = [];
  const selections: { kind: TargetKind; label: string }[] = [];
  const selectionTrace = await traced(browser, page, TASK_TRACE, async () => {
    for (let index = 0; index < SELECTIONS_PER_KIND; index += 1) {
      for (const kind of ["text", "cells"] as const) {
        const label = `${kind}-${index}`;
        await clearSelection(frame);
        // Each kind goes through the document: a different section for every drag.
        const points = await steadyTarget(frame, kind, "select", index * 3 + 1);
        releases.push(await drag(page, frame, points, label, DRAG_MOVES, DRAG_PAUSE_MS));
        const selected = await frame.evaluate(readSelection);
        assert.ok(kind === "cells" ? selected.acrossCells : selected.characters > 100,
          `${label}: the drag selected ${kind === "cells" ? "across table cells" : "running text"}: ${JSON.stringify(selected)}`);
        selections.push({ kind, label });
        log(`perf-547 selection ${label}: release to button ${releases[releases.length - 1]} ms, `
          + `${selected.characters} characters`);
      }
    }
  });
  const tasks = selections.map((selection) => ({ ...selection, ...longestTasks(selectionTrace, selection.label) }));
  const longest = (kind: TargetKind, phase: "drag" | "release"): Series =>
    series("ms", tasks.filter((task) => task.kind === kind).map((task) => task[phase]));

  const creations: number[] = [];
  for (let index = 0; index < CREATE_SAMPLES; index += 1) {
    creations.push(await createComment(page, frame, `create-${index}`, index));
    log(`perf-547 comment create-${index}: Save to highlight ${creations[index]} ms`);
  }

  const labels = Array.from({ length: RESTYLE_SAMPLES }, (_, index) => `restyle-${index}`);
  const timeline = await traced(browser, page, TIMELINE_TRACE, async () => {
    await frame.evaluate(forceStylePass);
    for (const [index, label] of labels.entries()) {
      await createComment(page, frame, label, CREATE_SAMPLES + index);
    }
  });
  const frameId = previewFrameId(timeline);
  const passes = labels.map((label) => restyled(timeline, frameId, label));
  log(`perf-547 restyled elements per comment creation: ${passes.map((pass) => pass.total).join(", ")}`);
  await clearSelection(frame);

  return {
    viewport,
    interactions: {
      selectionRelease: series("ms", releases),
      commentCreate: series("ms", creations),
      dragTextLongestTask: longest("text", "drag"),
      dragCellsLongestTask: longest("cells", "drag"),
      releaseTextLongestTask: longest("text", "release"),
      releaseCellsLongestTask: longest("cells", "release"),
    },
    commentCreateRestyledElements: {
      ...series("elements", passes.map((pass) => pass.total)),
      largestRecalc: passes.map((pass) => pass.largest),
    },
    threads: { before, after: (await readDocumentCounts(frame)).threads },
  };
}
