/**
 * StrykerJS configuration of `just mutation-core`, others phase (CR-450, mt-Q10): extends the core
 * phase. It mutates only the line and column ranges of the holes the core phase left (survived or
 * no coverage, listed by `node scripts/mutation-report.mjs --others-ranges` in
 * out/reports/mutation/core/hole-ranges.json as `file:line:col-line:col`), and runs the rest of
 * `test:unit` (every layer but `test/core`) with bail on. A hole one of these tests kills is
 * labelled "killed only by another layer" by the report reader, with the killing test.
 */
import * as fs from "node:fs";

import core, { phaseOutputs } from "./stryker.config.mjs";

const outputs = phaseOutputs("others");
const rangesFile = "out/reports/mutation/core/hole-ranges.json";
const ranges = fs.existsSync(rangesFile) ? JSON.parse(fs.readFileSync(rangesFile, "utf8")) : [];

export default {
  ...core,
  // With no hole there is nothing to mutate: the target skips this phase (see the justfile).
  mutate: ranges,
  // Bail on: a hole only needs one other-layer killer.
  disableBail: false,
  jsonReporter: outputs.jsonReporter,
  htmlReporter: outputs.htmlReporter,
  incrementalFile: outputs.incrementalFile,
  // Ranges differ between runs: never reuse a previous run's results.
  incremental: false,
  nodeTest: {
    include: [
      "out/test/{build,host,host-memory,host-vscode,node-services,page,session,site}/**/*.test.js",
    ],
    // Tests that need the git-tracked files of the real checkout: git does not track the copied sandbox.
    leftOut: {
      "out/test/build/lineEndingFixtures.test.js": "asks git for the tracked CRLF fixtures: the sandbox copy is not tracked",
      "out/test/build/readmeCommentThreads.test.js": "checks the README images, which the sandbox copy leaves out (ignorePatterns /images)",
    },
    manifest: outputs.nodeTestManifest,
  },
};
