/**
 * Stryker test-runner plugin `mdokf-node-test` (CR-450, mt-Q1, mt-Q9): Stryker has no `node:test`
 * runner, so this adapter runs the project's compiled unit tests (`out/test/**`, in the sandbox)
 * with `node --import ./scripts/register-myst-patches.mjs --import <preload> --test <files>`.
 *
 * How it works, in short (the details are in node-test-preload.mjs and node-test-pure.mjs):
 * - Test IDs are `<file relative to out/test>::<describe > test>`, assigned by the preload that wraps
 *   `node:test`, which also sets `__stryker__.currentTestId` around each test body (per-test coverage).
 * - Dry run: every test file runs once in its own process (Node's default isolation); the coverage
 *   of what ran while a file loaded is credited to each test of that file (mt-Q9), so no coverage is
 *   reported as global static and a mutant only runs the files that reach it.
 * - Mutant run: only the files that hold the covering tests of `testFilter` run, and in them only
 *   those tests. A fresh process per run, so a load-time mutant is active while its file loads.
 *   With bail off (`disableBail`) `killedBy` lists every failing test; with bail on, the files run
 *   one after the other and the run stops at the first failing file, `killedBy` is its first failure.
 * - Options (`nodeTest` in the Stryker configuration): `include` and `exclude` (globs relative to the
 *   sandbox), `leftOut` ({ glob: reason }, files that cannot run in the sandbox, listed in the
 *   manifest), `manifest` (path of the JSON that records the files run and left out), `concurrency`
 *   (`--test-concurrency`, default 1: Stryker already runs one runner per core).
 * Needs Node 22 or later (`fs.globSync`, `path.matchesGlob`).
 */
import { spawn, spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

import { DryRunStatus, MutantRunStatus, TestStatus } from "@stryker-mutator/api/test-runner";
import { PluginKind, commonTokens, declareClassPlugin, tokens } from "@stryker-mutator/api/plugin";

import { killers, mergeFileCoverage, relativeTestFile, selectTestFiles } from "./node-test-pure.mjs";

export const strykerValidationSchema = {
  properties: {
    nodeTest: {
      description: "Options of the mdokf-node-test runner (scripts/mutation/node-test-runner.mjs).",
      type: "object",
      additionalProperties: false,
      properties: {
        include: { type: "array", items: { type: "string" }, default: ["out/test/core/**/*.test.js"] },
        exclude: { type: "array", items: { type: "string" }, default: [] },
        leftOut: { type: "object", additionalProperties: { type: "string" }, default: {} },
        manifest: { type: "string" },
        concurrency: { type: "number", default: 1 },
      },
      default: {},
    },
  },
};

const PRELOAD_URL = pathToFileURL(path.join(import.meta.dirname, "node-test-preload.mjs")).href;
const TEST_ROOT = "out/test";

const slash = (value) => value.replace(/\\/gu, "/");

/** Stops a process and its children (the `node --test` runner starts one process per test file). */
function killTree(child) {
  if (!child.pid) return;
  if (process.platform === "win32") spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  else {
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch {
      child.kill("SIGKILL");
    }
  }
}

export class NodeTestRunner {
  static inject = tokens(commonTokens.options, commonTokens.logger);

  constructor(options, log) {
    this.log = log;
    this.settings = { include: ["out/test/core/**/*.test.js"], exclude: [], leftOut: {}, concurrency: 1, ...options.nodeTest };
    this.files = [];
    this.running = new Set();
  }

  capabilities() {
    return { reloadEnvironment: true };
  }

  async init() {
    const { include, exclude, leftOut, manifest } = this.settings;
    const all = fs.globSync(include, { cwd: process.cwd() }).map(slash).sort();
    const skipped = {};
    this.files = all.filter((file) => {
      const pattern = [...exclude, ...Object.keys(leftOut)].find((glob) => path.matchesGlob(file, glob));
      if (pattern === undefined) return true;
      skipped[file] = leftOut[pattern] ?? "excluded by configuration";
      return false;
    });
    if (this.files.length === 0) throw new Error(`mdokf-node-test: no test file matches ${JSON.stringify(include)} in ${process.cwd()}`);
    if (manifest) {
      fs.mkdirSync(path.dirname(manifest), { recursive: true });
      fs.writeFileSync(manifest, JSON.stringify({ included: this.files, leftOut: skipped }, null, 2));
    }
    this.log.info("mdokf-node-test: %s test files, %s left out", this.files.length, Object.keys(skipped).length);
  }

  /** The relative test file (an ID prefix) of every file this phase runs. */
  relativeFiles() {
    return this.files.map((file) => relativeTestFile(file, TEST_ROOT));
  }

  /** One `node --test` process over `files`; resolves with the exit state and the per-file result files. */
  execute(files, env, timeout) {
    const output = fs.mkdtempSync(path.join(os.tmpdir(), "stryker-nt-"));
    const started = performance.now();
    return new Promise((resolve) => {
      const child = spawn(
        process.execPath,
        [
          "--import", "./scripts/register-myst-patches.mjs",
          "--import", PRELOAD_URL,
          "--test", `--test-concurrency=${this.settings.concurrency}`, "--test-reporter=dot",
          ...files,
        ],
        {
          cwd: process.cwd(),
          env: { ...process.env, ...env, STUDIO_NT_OUT: output, STUDIO_NT_ROOT: path.resolve(TEST_ROOT) },
          stdio: ["ignore", "pipe", "pipe"],
          detached: process.platform !== "win32",
        },
      );
      this.running.add(child);
      let tail = "";
      const keep = (chunk) => {
        tail = (tail + chunk).slice(-3000);
      };
      child.stdout.on("data", keep);
      child.stderr.on("data", keep);
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        killTree(child);
      }, timeout);
      const done = (status) => {
        clearTimeout(timer);
        this.running.delete(child);
        const reports = fs.readdirSync(output).map((name) => JSON.parse(fs.readFileSync(path.join(output, name), "utf8")));
        fs.rmSync(output, { recursive: true, force: true });
        resolve({ status, timedOut, tail, reports, durationMs: Math.round(performance.now() - started) });
      };
      child.on("error", (error) => {
        tail += String(error);
        done(1);
      });
      child.on("close", (code) => done(code ?? 1));
    });
  }

  async dryRun(options) {
    const run = await this.execute(this.files, {}, options.timeout);
    if (run.timedOut) return { status: DryRunStatus.Timeout, reason: "the dry run timed out" };
    const tests = [];
    const reported = new Set();
    for (const report of run.reports) {
      reported.add(report.file);
      for (const result of report.tests) {
        tests.push({
          id: result.id,
          name: result.id,
          status: result.status === "success" ? TestStatus.Success : TestStatus.Failed,
          timeSpentMs: result.timeSpentMs,
          ...(result.status === "success" ? {} : { failureMessage: result.failureMessage }),
        });
      }
    }
    const missing = this.relativeFiles().filter((file) => !reported.has(file));
    if (missing.length > 0) {
      return { status: DryRunStatus.Error, errorMessage: `no result from ${missing.length} test file(s): ${missing.slice(0, 5).join(", ")}\n${run.tail}` };
    }
    return { status: DryRunStatus.Complete, tests, mutantCoverage: mergeFileCoverage(run.reports.map(asCoverageEntry)) };
  }

  async mutantRun(options) {
    const disableBail = options.disableBail === true;
    const byFile = new Map();
    for (const id of options.testFilter ?? []) {
      const file = id.slice(0, id.indexOf("::"));
      byFile.set(file, [...(byFile.get(file) ?? []), id]);
    }
    const selected = selectTestFiles(this.relativeFiles(), options.testFilter);
    const absolute = selected.map((file) => `${TEST_ROOT}/${file}`);
    const env = { STUDIO_NT_ACTIVE: options.activeMutant.id };
    if (options.hitLimit !== undefined) env.STUDIO_NT_HITLIMIT = String(options.hitLimit);
    let filterFile;
    if (options.testFilter) {
      filterFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "stryker-nt-filter-")), "filter.json");
      fs.writeFileSync(filterFile, JSON.stringify(Object.fromEntries(byFile)));
      env.STUDIO_NT_FILTER = filterFile;
    }
    try {
      const failures = [];
      let durationMs = 0;
      let total = 0;
      const batches = disableBail ? [absolute] : absolute.map((file) => [file]);
      for (const batch of batches) {
        const run = await this.execute(batch, env, options.timeout);
        durationMs += run.durationMs;
        if (run.timedOut) return { status: MutantRunStatus.Timeout, reason: "the test run timed out", duration: durationMs };
        const results = run.reports.flatMap((report) => report.tests);
        total += results.length;
        const failed = results.filter((result) => result.status === "failed");
        // A file that crashed (for example at load time) before any test failed: its tests could not pass.
        const reported = new Set(run.reports.map((report) => report.file));
        const missing = batch.filter((file) => !reported.has(relativeTestFile(file, TEST_ROOT)));
        if (missing.length > 0 && run.status === 0) {
          return { status: MutantRunStatus.Error, errorMessage: `no result from ${missing.join(", ")}\n${run.tail}` };
        }
        const crashedFiles = run.status !== 0 && failed.length === 0 ? batch : missing;
        const crashIds = crashedFiles.flatMap((file) => {
          const relative = relativeTestFile(file, TEST_ROOT);
          return byFile.get(relative) ?? [`${relative}::<test file crashed>`];
        });
        failures.push(...failed);
        for (const id of crashIds) {
          if (!failures.some((failure) => failure.id === id)) failures.push({ id, status: "failed", failureMessage: run.tail || "test file crashed" });
        }
        if (!disableBail && failures.length > 0) break;
      }
      const hitLimit = failures[0]?.failureMessage?.includes("Hit count limit reached");
      if (hitLimit) return { status: MutantRunStatus.Timeout, reason: "hit count limit reached", duration: durationMs };
      const killedBy = killers(failures, disableBail);
      if (killedBy.length > 0) {
        return { status: MutantRunStatus.Killed, killedBy, failureMessage: failures[0].failureMessage ?? "", nrOfTests: total, duration: durationMs };
      }
      return { status: MutantRunStatus.Survived, nrOfTests: total, duration: durationMs };
    } finally {
      if (filterFile) fs.rmSync(path.dirname(filterFile), { recursive: true, force: true });
    }
  }

  async dispose() {
    for (const child of this.running) killTree(child);
    this.running.clear();
  }
}

/** Only tests that ran get coverage: a test skipped by its options (needsSymlinks on Windows) is no result. */
function asCoverageEntry(report) {
  return { tests: report.tests.map((result) => result.id), staticCoverage: report.staticCoverage, perTest: report.perTest };
}

export const strykerPlugins = [declareClassPlugin(PluginKind.TestRunner, "mdokf-node-test", NodeTestRunner)];
