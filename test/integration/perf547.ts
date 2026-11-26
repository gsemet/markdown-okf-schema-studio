/**
 * Real-window measure of a comment on a large document (issue 547): `just ci-perf-547`, or
 * `STUDIO_REAL_INPUT_SCENARIO=perf-547 npm run test:integration -- --trusted-only`.
 *
 * Opens the generated document of test/probe/perf547Document.ts (22 tables, 11 images, 9 comment
 * threads, about 3000 elements) in a side preview of a real VS Code window, drags over its text and
 * across its table cells with the real mouse, and creates comments from the Comment button. What is
 * measured, and how, is in test/probe/perf547Measure.ts.
 *
 * The comment author setting stays unset, so `commentCreate` includes the author lookup a user gets.
 * The comments of a local run carry that name: they go with the fixture, and no picture is taken.
 *
 * It writes out/reports/probe/perf-547.json (every sample and the median per interaction) and prints
 * the same JSON after `PERF-547`. It sets no limit; it fails only when what it measures did not
 * happen.
 */

import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import type { Browser, Page } from "playwright-core";
import * as vscode from "vscode";

import { settle } from "./performanceProbe";
import {
  closeAllEditors,
  createFixture,
  currentPreviewFrame,
  openSidePreview,
  waitFor,
  waitForRender,
} from "./realInput/harness";
import { PERF547_FILE, PERF547_SHAPE, perf547Document } from "../probe/perf547Document";
import { measurePerf547, readDocumentCounts } from "../probe/perf547Measure";
import { REPORTS_ROOT } from "../reportPaths";

const REPORT = path.join(REPORTS_ROOT, "probe", "perf-547.json");

export async function scenarioPerf547(browser: Browser, page: Page): Promise<void> {
  // A report of an earlier run must not pass for the one of this run.
  fs.rmSync(REPORT, { force: true });
  const fixture = createFixture("perf-547", perf547Document());
  try {
    const source = await vscode.workspace.openTextDocument(vscode.Uri.file(fixture.path(PERF547_FILE)));
    await openSidePreview(source);
    await waitForRender(source);
    await waitFor("the comment highlights and the images of the document", async () => {
      const counts = await readDocumentCounts(await currentPreviewFrame(page));
      return counts.highlights === PERF547_SHAPE.threads && counts.imagesLoaded === PERF547_SHAPE.images;
    }, 60_000);
    await settle();
    const frame = await currentPreviewFrame(page);
    const counts = await readDocumentCounts(frame);
    const shown = {
      lines: source.getText().split("\n").length - 1,
      tables: counts.tables,
      rows: counts.rows,
      images: counts.imagesLoaded,
      threads: counts.threads,
      elements: counts.elements,
    };
    assert.deepEqual(
      [shown.lines, shown.tables, shown.rows, shown.images, shown.threads, counts.orphans],
      [PERF547_SHAPE.lines, PERF547_SHAPE.tables, PERF547_SHAPE.rows, PERF547_SHAPE.images, PERF547_SHAPE.threads, 0],
      "the preview shows the whole document and anchors its threads");

    const measures = await measurePerf547(browser, page, frame, (line) => console.log(line));
    const report = {
      schema: 1,
      scenario: "perf-547",
      generatedAt: new Date().toISOString(),
      environment: { vscode: vscode.version, platform: process.platform, previewViewport: measures.viewport },
      document: shown,
      interactions: measures.interactions,
      commentCreateRestyledElements: measures.commentCreateRestyledElements,
      threads: measures.threads,
    };
    fs.mkdirSync(path.dirname(REPORT), { recursive: true });
    fs.writeFileSync(REPORT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log("PERF-547 " + JSON.stringify(report, null, 2));
  } finally {
    await closeAllEditors();
    fixture.dispose();
  }
}
