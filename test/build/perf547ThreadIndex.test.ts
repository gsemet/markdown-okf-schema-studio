/**
 * The Node part of the `perf-547` measure: the generated documents it times
 * (test/probe/perf547Document.ts) and what it adds to the report (perf547ThreadIndex.ts).
 */

import * as assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import { PERF547_FILE, perf547Document } from "../probe/perf547Document";
import { addThreadIndex, measureThreadIndex } from "../probe/perf547ThreadIndex";

const sha256 = (text: string): string => createHash("sha256").update(text).digest("hex");

// The runs of the window measure are compared with each other: the document must not move.
test("the document of the window measure keeps the same bytes", () => {
  const files = perf547Document();
  const fingerprint = (file: string): [number, string] => [Buffer.byteLength(files[file]!), sha256(files[file]!)];
  assert.equal(Object.keys(files).length, 13);
  assert.deepEqual(fingerprint(PERF547_FILE),
    [64579, "bea73f28631d98b4fb0566055d6c17c954e2089ecc0126bfbcd22b91dc068289"]);
  assert.deepEqual(fingerprint("report.comments.json"),
    [7534, "df1f01f87008cf21443f122bee2150ee456dc61d587d989a749e22c4562c73f9"]);
  assert.equal(sha256(JSON.stringify(files)), "f1c010b1cce9f1a446f6812b2c764b69aa91320cf5f5e48a77dcb73c914b8ae9");
  assert.deepEqual(perf547Document(1), files);
});

test("the larger document has four times the lines, tables, rows, images and threads", () => {
  const files = perf547Document(4);
  const lines = files[PERF547_FILE]!.split("\n").slice(0, -1);
  const delimiters = lines.filter((line) => line.startsWith("|---")).length;
  assert.deepEqual({
    lines: lines.length,
    tables: delimiters,
    // The header row and the body rows of every table.
    rows: lines.filter((line) => line.startsWith("|")).length - delimiters,
    images: Object.keys(files).filter((file) => file.endsWith(".svg")).length,
    blockquotes: lines.filter((line) => line.startsWith("> ")).length,
    threads: (JSON.parse(files["report.comments.json"]!) as { threads: unknown[] }).threads.length,
  }, { lines: 1856, tables: 88, rows: 788, images: 44, blockquotes: 84, threads: 36 });
});

// `measureThreadIndex` itself fails when a thread of a document is not anchored where it was stored.
test("the thread index measure times both functions on both documents", () => {
  const measure = measureThreadIndex(3);
  assert.deepEqual(measure.documents.map(({ name, lines, threads }) => ({ name, lines, threads })), [
    { name: "issue-size", lines: 464, threads: 9 },
    { name: "four-times", lines: 1856, threads: 36 },
  ]);
  assert.equal(measure.documents[0]!.bytes, 64579);
  for (const document of measure.documents) {
    for (const times of [document.createDocumentIndex, document.reanchorThreads]) {
      assert.equal(times.unit, "ms");
      assert.equal(times.samples.length, 3);
      assert.ok(times.samples.every((sample) => sample >= 0) && times.median >= 0, JSON.stringify(times));
    }
  }
});

test("the thread index measure is added to the report of the window run, which must exist", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "perf547-report-"));
  try {
    const report = path.join(directory, "perf-547.json");
    const measure = { node: "v0.0.0", documents: [] };
    assert.throws(() => addThreadIndex(report, measure), /ENOENT/u);
    fs.writeFileSync(report, JSON.stringify({ scenario: "perf-547", threads: { before: 9 } }));
    addThreadIndex(report, measure);
    assert.deepEqual(JSON.parse(fs.readFileSync(report, "utf8")),
      { scenario: "perf-547", threads: { before: 9 }, threadIndex: measure });
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
