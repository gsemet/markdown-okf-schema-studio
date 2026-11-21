/**
 * StrykerJS 10.1.1 configuration of `just mutation-core`, core phase (CR-450): mutates `src/core`,
 * runs the `test/core` unit tests, bail off so every killer of a mutant is recorded (the redundancy
 * list needs them all). `scripts/stryker.others.config.mjs` extends it for the other layers' phase.
 *
 * Run as `stryker run scripts/stryker.config.mjs` from the repository root. Sample of files:
 * STUDIO_MUTATION_FILES (comma-separated globs or files, default: the whole of src/core).
 * Reports go under out/reports/mutation/<phase>/ (git-ignored); Stryker's sandboxes under
 * `tempDirName`, git-ignored too.
 */
import * as path from "node:path";

const mutationDir = path.join(import.meta.dirname, "mutation");
const files = (process.env.STUDIO_MUTATION_FILES ?? "")
  .split(/[,\n]/u)
  .map((entry) => entry.trim())
  .filter(Boolean);

/** Reports and incremental file of one phase, under out/reports/mutation/<phase>/. */
export function phaseOutputs(phase) {
  const folder = `out/reports/mutation/${phase}`;
  return {
    incrementalFile: `${folder}/stryker-incremental.json`,
    jsonReporter: { fileName: `${folder}/mutation.json` },
    htmlReporter: { fileName: `${folder}/mutation.html` },
    nodeTestManifest: path.resolve(`${folder}/test-files.json`),
  };
}

const outputs = phaseOutputs("core");

export default {
  mutate: files.length > 0 ? files : ["src/core/**/*.ts", "!src/core/**/*.d.ts"],
  plugins: [
    path.join(mutationDir, "node-test-runner.mjs"),
    path.join(mutationDir, "ts7-checker.mjs"),
    path.join(mutationDir, "ignorer.mjs"),
  ],
  testRunner: "mdokf-node-test",
  // The TS 7 checker is always on: no switch turns it off (mt-Q7).
  checkers: ["mdokf-ts7"],
  ignorers: ["mdokf-messages"],
  // An absent file name: Stryker core's tsconfig preprocessor then never imports `typescript`, whose
  // classic API is gone in TypeScript 7 (`parseConfigFileTextToJson` would fail). Never `inPlace`.
  tsconfigFile: "stryker-no-tsconfig.json",
  // Default sandbox folder; /.stryker-tmp/ is in .gitignore.
  tempDirName: ".stryker-tmp",
  // Instrumented files carry `// @ts-nocheck`, so tsc 7 compiles them; the type check of each
  // mutant is the checker's job, on the uninstrumented code.
  buildCommand: "npm run compile",
  coverageAnalysis: "perTest",
  // Bail off: `killedBy` names every failing test, which the redundancy reading needs.
  disableBail: true,
  ignorePatterns: [
    "/out",
    "/.venv",
    "/.cache",
    "/.artifacts",
    "/.agents",
    "/.github",
    "/images",
    "/test/visual/screenshots",
    "/.vscode-test",
  ],
  reporters: ["json", "html", "clear-text", "progress"],
  jsonReporter: outputs.jsonReporter,
  htmlReporter: outputs.htmlReporter,
  incremental: true,
  incrementalFile: outputs.incrementalFile,
  clearTextReporter: { allowColor: false, reportTests: false, reportMutants: false, reportScoreTable: true },
  nodeTest: {
    include: ["out/test/core/**/*.test.js", "out/test/core/render/*.contract.js"],
    // Test files that cannot run in the sandbox: pattern -> reason (listed in the report).
    leftOut: {},
    manifest: outputs.nodeTestManifest,
  },
};
