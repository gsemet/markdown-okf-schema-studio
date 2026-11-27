/**
 * What the index of the review comment threads costs (issue 547), in plain Node:
 * `createDocumentIndex` and `reanchorThreads` (called with the text, so it indexes it too) of
 * src/core/comments/anchoring.ts, on the document of perf547Document.ts and on the one four times
 * as large. Every thread of both anchors where it was stored: the cost of an orphan or of a search
 * for a changed quote is not measured.
 *
 * `just ci-perf-547` runs it after the window run: `node out/test/probe/perf547ThreadIndex.js
 * [report]` adds `threadIndex` to the report (out/reports/probe/perf-547.json by default) and
 * prints it after `PERF-547-THREAD-INDEX`. It sets no limit; it fails only when what it measures
 * did not happen (no report, a thread that is not anchored).
 */

import * as assert from "node:assert/strict";
import * as fs from "node:fs";

import { createDocumentIndex, reanchorThreads } from "../../src/core/comments/anchoring";
import { parseSidecar } from "../../src/core/comments/commentModel";
import { PERF547_REPORT } from "../reportPaths";
import { PERF547_FILE, PERF547_SHAPE, perf547Document } from "./perf547Document";
import { series, type Series } from "./perf547Measure";

/** Timed calls of each function on each document, after one warm-up call that is not a sample. */
const SAMPLES = 9;
/** The document of the window run, and the one four times as large. */
const DOCUMENTS = [{ name: "issue-size", scale: 1 }, { name: "four-times", scale: 4 }] as const;

export interface ThreadIndexDocument {
  readonly name: string;
  readonly lines: number;
  readonly bytes: number;
  readonly threads: number;
  readonly createDocumentIndex: Series;
  readonly reanchorThreads: Series;
}

export interface ThreadIndexMeasure {
  /** The Node that ran the measure: it runs outside VS Code. */
  readonly node: string;
  readonly documents: ThreadIndexDocument[];
}

function timed(samples: number, run: () => unknown): Series {
  run();
  return series("ms", Array.from({ length: samples }, () => {
    const started = performance.now();
    run();
    return Math.round((performance.now() - started) * 100) / 100;
  }));
}

function measureDocument(name: string, scale: number, samples: number): ThreadIndexDocument {
  const files = perf547Document(scale);
  const text = files[PERF547_FILE]!;
  const sidecar = parseSidecar(files[PERF547_FILE.replace(/\.md$/u, ".comments.json")]!);
  assert.deepEqual(sidecar.errors, [], `${name}: the comments file is valid`);
  const { threads } = sidecar;
  const outcome = reanchorThreads(text, threads);
  assert.deepEqual([threads.length, outcome.orphaned.size, outcome.changed], [PERF547_SHAPE.threads * scale, 0, false],
    `${name}: every thread is anchored at its stored lines (threads, orphans, moved)`);
  return {
    name,
    lines: text.split("\n").length - 1,
    bytes: Buffer.byteLength(text, "utf8"),
    threads: threads.length,
    createDocumentIndex: timed(samples, () => createDocumentIndex(text)),
    reanchorThreads: timed(samples, () => reanchorThreads(text, threads)),
  };
}

export function measureThreadIndex(samples = SAMPLES): ThreadIndexMeasure {
  return {
    node: process.version,
    documents: DOCUMENTS.map(({ name, scale }) => measureDocument(name, scale, samples)),
  };
}

/** Adds `threadIndex` to the report of the window run, which must exist. */
export function addThreadIndex(reportFile: string, threadIndex: ThreadIndexMeasure): void {
  const report = JSON.parse(fs.readFileSync(reportFile, "utf8")) as Record<string, unknown>;
  assert.equal(report.scenario, "perf-547", `${reportFile} is the report of the perf-547 scenario`);
  fs.writeFileSync(reportFile, `${JSON.stringify({ ...report, threadIndex }, null, 2)}\n`, "utf8");
}

if (require.main === module) {
  const threadIndex = measureThreadIndex();
  addThreadIndex(process.argv[2] ?? PERF547_REPORT, threadIndex);
  console.log("PERF-547-THREAD-INDEX " + JSON.stringify(threadIndex, null, 2));
}
