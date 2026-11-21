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
  labelHoles(mutants: Mutant[], kills: Map<string, string[]>): { label: string; killedBy: string[] }[];
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
  const map = pure.swrsByTest({ "core/x/a.test.ts": source }, { "core/x/a.markers.ts": "// @tests_req SwRS-X-A-003 — second\n" });
  assert.deepEqual([...(map.get("core/x/a.test.js::second") ?? [])], ["SwRS-X-A-003"]);
});
