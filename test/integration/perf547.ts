/**
 * Real-window measure of a comment on a large document (issue 547): `just ci-perf-547`, or
 * `STUDIO_REAL_INPUT_SCENARIO=perf-547 npm run test:integration -- --trusted-only`.
 *
 * Opens the generated document of test/probe/perf547Document.ts (22 tables, 11 images, 9 comment
 * threads, about 3000 elements) in a side preview of a real VS Code window, drags over its text and
 * across its table cells with the real mouse, and creates comments from the Comment button. What is
 * measured, and how, is in test/probe/perf547Measure.ts.
 *
 * The comment author setting stays empty, so `commentCreate` includes the author lookup a user
 * gets. The fixture folder is its own Git repository, with an invented local `user.name` and no
 * commit (no HEAD, so the preview marks no incoming change): the comments carry that name, and
 * `authorWait` is how long each comment write waited for it.
 *
 * It writes out/reports/probe/perf-547.json (every sample and the median, per interaction and for
 * `authorWait`) and prints the same JSON after `PERF-547`; test/probe/perf547ThreadIndex.ts then
 * adds `threadIndex` to the file. It sets no limit; it fails only when what it measures did not
 * happen.
 */

import * as assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import type { Browser, Page } from "playwright-core";
import * as vscode from "vscode";

import { getActivePreviewForTests } from "./extensionApi";
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
import { measurePerf547, readDocumentCounts, series } from "../probe/perf547Measure";
import { PERF547_REPORT } from "../reportPaths";

const COMMENTS_FILE = PERF547_FILE.replace(/\.md$/u, ".comments.json");
/** The invented Git user name of the fixture's own repository: what a comment write waits for. */
const GIT_AUTHOR = "Lorem Reviewer";

interface GitApi {
  openRepository(root: vscode.Uri): Promise<unknown>;
  getRepository(uri: vscode.Uri): { rootUri: vscode.Uri } | null;
}

function initRepository(directory: string): void {
  // Without the GIT_* variables of the caller, which could send these commands to another repository.
  const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith("GIT_")));
  const git = (...args: string[]): void => {
    execFileSync("git", args, { cwd: directory, env, stdio: "pipe" });
  };
  git("init", "--quiet");
  git("config", "--local", "user.name", GIT_AUTHOR);
}

/**
 * Waits until the built-in Git extension holds `directory` as the repository of `uri`: the checkout
 * around the fixture is a repository too, with the user name of whoever runs the measure.
 */
async function openFixtureRepository(directory: string, uri: vscode.Uri): Promise<void> {
  const extension = vscode.extensions.getExtension<{ getAPI(version: 1): GitApi }>("vscode.git");
  assert.ok(extension, "the built-in Git extension is present in the test host");
  const api = (await extension.activate()).getAPI(1);
  await api.openRepository(vscode.Uri.file(directory));
  await waitFor("the Git extension to report the fixture folder as the repository of the document", () => {
    const root = api.getRepository(uri)?.rootUri.fsPath;
    return root !== undefined && path.relative(root, directory) === "";
  }, 30_000);
}

/** The threads of the comments file, each with its comments. */
function storedThreads(file: string): { id: string; comments: { author: string }[] }[] {
  return (JSON.parse(fs.readFileSync(file, "utf8")) as { threads: ReturnType<typeof storedThreads> }).threads;
}

export async function scenarioPerf547(browser: Browser, page: Page): Promise<void> {
  // A report of an earlier run must not pass for the one of this run.
  fs.rmSync(PERF547_REPORT, { force: true });
  const fixture = createFixture("perf-547", perf547Document());
  try {
    initRepository(fixture.directory);
    const uri = vscode.Uri.file(fixture.path(PERF547_FILE));
    await openFixtureRepository(fixture.directory, uri);
    assert.equal(vscode.workspace.getConfiguration("markdownOkfSchemaStudio.comments", uri).get("authorName"), "",
      "the comment author setting is empty, so a comment write asks Git for the name");
    const generated = new Set(storedThreads(fixture.path(COMMENTS_FILE)).map((thread) => thread.id));
    const source = await vscode.workspace.openTextDocument(uri);
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
    const created = storedThreads(fixture.path(COMMENTS_FILE)).filter((thread) => !generated.has(thread.id));
    assert.equal(created.length, measures.threads.after - measures.threads.before, "every new comment is stored");
    assert.deepEqual([...new Set(created.map((thread) => thread.comments[0]!.author))], [GIT_AUTHOR],
      "the stored author is the Git user name of the fixture folder");
    const waits = getActivePreviewForTests()?.comments.authorWaitsMs ?? [];
    assert.equal(waits.length, created.length, "one wait for the Git user name per comment write");
    const authorWait = series("ms", waits.map((wait) => Math.round(wait * 100) / 100));
    console.log(`perf-547 wait for the Git user name per comment write: ${authorWait.samples.join(", ")} ms`);
    const report = {
      schema: 1,
      scenario: "perf-547",
      generatedAt: new Date().toISOString(),
      environment: { vscode: vscode.version, platform: process.platform, previewViewport: measures.viewport },
      document: shown,
      fixtureFolder: { gitRepository: true, localUserName: GIT_AUTHOR, commits: 0 },
      interactions: measures.interactions,
      authorWait,
      commentCreateRestyledElements: measures.commentCreateRestyledElements,
      threads: measures.threads,
    };
    fs.mkdirSync(path.dirname(PERF547_REPORT), { recursive: true });
    fs.writeFileSync(PERF547_REPORT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log("PERF-547 " + JSON.stringify(report, null, 2));
  } finally {
    await closeAllEditors();
    fixture.dispose();
  }
}
