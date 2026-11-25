import assert from "node:assert/strict";
import * as path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

const projectRoot = path.resolve(__dirname, "../../..");
type Mutant = {
  file: string;
  key: string;
  status: string;
  mutator: string;
  replacement: string;
  start: { line: number; column: number };
  end: { line: number; column: number };
  coveredBy: string[];
  killedBy: string[];
};
type Pure = {
  normalizeReport(json: unknown): { tests: Map<string, string>; mutants: Mutant[] };
  scoreOf(counts: Record<string, number>): number | undefined;
  subFolderOf(file: string): string;
  holeRanges(report: { mutants: Mutant[] }): string[];
  labelHoles(mutants: Mutant[], kills: Map<string, string[]>, timeouts?: Set<string>): { label: string; killedBy: string[]; otherTimeout: boolean }[];
  otherLayerTimeouts(mutants: Mutant[], holeKeys: Set<string>): Set<string>;
  isJudgeable(testName: string, sampled: Set<string>): boolean;
  splitBySample(entries: (string | { name: string })[], sampled: Set<string>): { judged: unknown[]; outside: unknown[] };
  classifyTests(
    ran: string[],
    mutants: Mutant[],
  ): { zeroKill: { name: string }[]; notJudged: { name: string }[]; reachesNothing: string[]; kills: Map<string, Mutant[]> };
  redundantTests(kills: Map<string, Mutant[]>): { keepers: string[]; redundant: { name: string }[] };
  testsOfSource(source: string): { name: string; ids: string[]; line: number }[];
  swrsByTest(sources: Record<string, string>, companions?: Record<string, string>): Map<string, Set<string>>;
};

const load = (): Promise<Pure> => import(pathToFileURL(path.join(projectRoot, "scripts/mutation/report-pure.mjs")).href);
const mutant = (id: string, status: string, coveredBy: string[], killedBy: string[] = []) => ({
  id,
  status,
  mutatorName: "ConditionalExpression",
  replacement: id === "3" ? "false" : "true",
  coveredBy,
  killedBy,
  location: { start: { line: 3, column: 5 + Number(id) }, end: { line: 3, column: 9 + Number(id) } },
});
const report = {
  testFiles: {
    "": {
      tests: [
        { id: "0", name: "core/x/a.test.js::one" },
        { id: "1", name: "core/x/a.test.js::two" },
        { id: "2", name: "core/x/a.test.js::three" },
      ],
    },
  },
  files: {
    "src/core/x/a.ts": {
      mutants: [
        mutant("1", "Killed", ["0", "1"], ["0", "1"]),
        mutant("2", "Killed", ["0"], ["0"]),
        mutant("3", "Survived", ["2"]),
        mutant("4", "NoCoverage", []),
        mutant("5", "CompileError", []),
      ],
    },
  },
};

test("a report is read with test names, locations and the score of Stryker", async () => {
  const pure = await load();
  const read = pure.normalizeReport(report);
  assert.equal(read.mutants.length, 5);
  assert.deepEqual(read.mutants[0].killedBy, ["core/x/a.test.js::one", "core/x/a.test.js::two"]);
  assert.equal(pure.scoreOf({ Killed: 2, Survived: 1, NoCoverage: 1, CompileError: 9 }), 50);
  assert.equal(pure.scoreOf({ CompileError: 1 }), undefined);
  assert.equal(pure.subFolderOf("src/core/x/a.ts"), "x");
  assert.equal(pure.subFolderOf("src/core/a.ts"), "(root)");
});

test("holes are the survived and uncovered mutants, as ranges for the others phase and as labels", async () => {
  const pure = await load();
  const read = pure.normalizeReport(report);
  assert.deepEqual(pure.holeRanges(read), ["src/core/x/a.ts:3:7-3:11", "src/core/x/a.ts:3:8-3:12"]);
  const labels = pure.labelHoles(read.mutants, new Map([[read.mutants[2].key, ["page/p.test.js::kills it"]]]));
  assert.equal(labels.length, 2);
  assert.equal(labels.find((hole) => hole.killedBy.length > 0)?.label, "killed only by another layer");
  assert.equal(labels.find((hole) => hole.killedBy.length === 0)?.label, "no test kills it");
});

test("tests are classified as zero-kill or reaching nothing, and the redundant set is greedy", async () => {
  const pure = await load();
  const read = pure.normalizeReport(report);
  const ran = [...read.tests.values(), "core/x/a.test.js::four"];
  const classes = pure.classifyTests(ran, read.mutants);
  assert.deepEqual(classes.zeroKill.map((t) => t.name), ["core/x/a.test.js::three"]);
  assert.deepEqual(classes.reachesNothing, ["core/x/a.test.js::four"]);
  const { keepers, redundant } = pure.redundantTests(classes.kills);
  assert.deepEqual(keepers, ["core/x/a.test.js::one"]);
  assert.deepEqual(redundant.map((t) => t.name), ["core/x/a.test.js::two"]);
});

test("the SwRS of a test come from the marker block above it or inside its body, and from companion lines", async () => {
  const pure = await load();
  const source = [
    "// @tests_req SwRS-X-A-001",
    'test("first", () => {',
    "  // @tests_req SwRS-X-A-002",
    "});",
    "",
    'test("second", () => {});',
  ].join("\n");
  assert.deepEqual(pure.testsOfSource(source), [
    { name: "first", ids: ["SwRS-X-A-001", "SwRS-X-A-002"], line: 2 },
    { name: "second", ids: [], line: 6 },
  ]);
  const withFragments = ["// @tests_req SwRS-X-A-004#S1", "// @tests_req SwRS-X-A-004#S2", 'test("third", () => {});'].join("\n");
  assert.deepEqual(pure.testsOfSource(withFragments), [{ name: "third", ids: ["SwRS-X-A-004"], line: 3 }]);
  const map = pure.swrsByTest({ "core/x/a.test.ts": source }, { "core/x/a.markers.ts": "// @tests_req SwRS-X-A-003 — second\n" });
  assert.deepEqual([...(map.get("core/x/a.test.js::second") ?? [])], ["SwRS-X-A-003"]);
});

test("a hole that only timed out in another layer stays unkilled and says so", async () => {
  const pure = await load();
  const read = pure.normalizeReport(report);
  const holes = new Set([read.mutants[2].key, read.mutants[3].key]);
  const timedOut = pure.otherLayerTimeouts([{ ...read.mutants[2], status: "Timeout" }, { ...read.mutants[3], status: "Killed" }], holes);
  assert.deepEqual([...timedOut], [read.mutants[2].key]);
  const labels = pure.labelHoles(read.mutants, new Map(), timedOut);
  assert.deepEqual(labels.map((hole) => [hole.label, hole.otherTimeout]), [["no test kills it", true], ["no test kills it", false]]);
});

test("with a sample, only tests of a file named after a sampled source file are judged", async () => {
  const pure = await load();
  const sampled = new Set(["src/core/x/a.ts", "src/core/x/deep/b.ts"]);
  assert.equal(pure.isJudgeable("core/x/a.test.js::one", sampled), true);
  assert.equal(pure.isJudgeable("core/x/deep/b.test.js::one > two", sampled), true);
  assert.equal(pure.isJudgeable("core/x/c.test.js::one", sampled), false);
  assert.equal(pure.isJudgeable("core/x/a.requirements.test.js::one", sampled), true);
  assert.equal(pure.isJudgeable("core/y/a.test.js::one", sampled), false);
  assert.equal(pure.isJudgeable("page/a.test.js::one", sampled), false);
  const split = pure.splitBySample([{ name: "core/x/a.test.js::one" }, "core/y/a.test.js::two"], sampled);
  assert.equal(split.judged.length, 1);
  assert.equal(split.outside.length, 1);
});

test("a zero-kill test that only shares load-time coverage with its file is not judged", async () => {
  const pure = await load();
  const names = ["core/x/a.test.js::one", "core/x/a.test.js::two", "core/x/b.test.js::solo"];
  const mutants = [
    // Load-time mutant: credited to every test of a.test.js, killed by none.
    { ...mutant("1", "Survived", ["0", "1"]), key: "m1" },
    // Reached by "one" only and killed by nobody: a real zero-kill.
    { ...mutant("2", "Survived", ["0"]), key: "m2" },
    { ...mutant("3", "Survived", ["2"]), key: "m3" },
  ];
  const named = mutants.map((m) => ({ ...m, coveredBy: m.coveredBy.map((id) => names[Number(id)]), killedBy: [] as string[], file: "src/core/x/a.ts", start: { line: 1, column: 1 } }));
  const classes = pure.classifyTests(names, named as never);
  assert.deepEqual(classes.zeroKill.map((t) => t.name), ["core/x/a.test.js::one", "core/x/b.test.js::solo"]);
  const loadOnly = pure.classifyTests(names, named.slice(0, 1) as never);
  assert.deepEqual(loadOnly.notJudged.map((t) => t.name), ["core/x/a.test.js::one", "core/x/a.test.js::two"]);
  assert.deepEqual(loadOnly.zeroKill, []);
});
