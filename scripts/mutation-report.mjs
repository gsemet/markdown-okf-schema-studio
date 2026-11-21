/**
 * Mutation report reader (CR-450, spec 4.6) of `just mutation-core`.
 *
 *   node scripts/mutation-report.mjs --others-ranges   writes out/reports/mutation/core/hole-ranges.json
 *   node scripts/mutation-report.mjs                   writes out/reports/mutation/summary.md and summary.json
 *
 * Reads out/reports/mutation/core/mutation.json, out/reports/mutation/others/mutation.json (when the
 * others phase ran), the test manifests, and the test sources under test/ (for the SwRS of each
 * test). The summary has: score per sub-folder of src/core and per SwRS, zero-kill tests, the greedy
 * redundant set, tests not judged, holes with labels, test files left out and why.
 * The reading rules are in scripts/mutation/report-pure.mjs.
 */
import * as fs from "node:fs";
import * as path from "node:path";

import { classifyTests, folderScores, holeRanges, labelHoles, normalizeReport, otherLayerKills, redundantTests, swrsByTest, swrsScores } from "./mutation/report-pure.mjs";
import { renderSummary } from "./mutation/report-render.mjs";

const root = process.cwd();
const dir = path.join(root, "out/reports/mutation");
const readJson = (file) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : undefined);

function listFiles(folder, keep) {
  if (!fs.existsSync(folder)) return [];
  return fs.readdirSync(folder, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && keep(entry.name))
    .map((entry) => path.join(entry.parentPath, entry.name));
}

const coreJson = readJson(path.join(dir, "core/mutation.json"));
if (!coreJson) {
  console.error("mutation-report: out/reports/mutation/core/mutation.json is missing: run `just mutation-core` first");
  process.exit(1);
}
const core = normalizeReport(coreJson);

if (process.argv.includes("--others-ranges")) {
  const ranges = holeRanges(core);
  fs.writeFileSync(path.join(dir, "core/hole-ranges.json"), JSON.stringify(ranges, null, 2));
  console.log(`mutation-report: ${ranges.length} hole range(s) for the others phase`);
  process.exit(0);
}

const othersJson = readJson(path.join(dir, "others/mutation.json"));
const holes = new Set(core.mutants.filter((mutant) => ["Survived", "NoCoverage"].includes(mutant.status)).map((mutant) => mutant.key));
const others = othersJson ? normalizeReport(othersJson) : undefined;
const otherKills = others ? otherLayerKills(others.mutants, holes) : new Map();

const sources = {};
const companions = {};
for (const file of listFiles(path.join(root, "test/core"), (name) => name.endsWith(".ts"))) {
  const relative = path.relative(path.join(root, "test"), file).replace(/\\/gu, "/");
  (/\.markers\.ts$/u.test(relative) ? companions : relative.endsWith(".test.ts") ? sources : {})[relative] = fs.readFileSync(file, "utf8");
}
const mapping = swrsByTest(sources, companions);

const ranTests = [...core.tests.values()];
const classes = classifyTests(ranTests, core.mutants);
const redundancy = redundantTests(classes.kills);
const manifest = (phase) => readJson(path.join(dir, phase, "test-files.json"));
const coreManifest = manifest("core");
const mutantCounts = {};
for (const mutant of core.mutants) mutantCounts[mutant.status] = (mutantCounts[mutant.status] ?? 0) + 1;

const summary = {
  generated: new Date().toISOString(),
  phases: { core: true, others: Boolean(others) },
  mutants: mutantCounts,
  folders: folderScores(core.mutants, otherKills),
  swrs: swrsScores(core.mutants, mapping, ranTests),
  tests: ranTests.length,
  zeroKill: classes.zeroKill,
  notJudged: classes.notJudged,
  reachesNothing: classes.reachesNothing,
  keepers: redundancy.keepers.length,
  redundant: redundancy.redundant,
  holes: labelHoles(core.mutants, otherKills),
  testFilesRun: coreManifest?.included ?? [],
  testFilesLeftOut: coreManifest?.leftOut ?? {},
};

fs.writeFileSync(path.join(dir, "summary.json"), JSON.stringify(summary, null, 2));
fs.writeFileSync(path.join(dir, "summary.md"), renderSummary(summary));
console.log(`mutation-report: ${path.relative(root, path.join(dir, "summary.md"))} and summary.json written (${core.mutants.length} mutants, ${ranTests.length} tests)`);
