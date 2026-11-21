import assert from "node:assert/strict";
import * as path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

const projectRoot = path.resolve(__dirname, "../../..");
const load = <T>(file: string): Promise<T> => import(pathToFileURL(path.join(projectRoot, file)).href);

type Location = { start: { line: number; column: number }; end: { line: number; column: number } };
type Pure = {
  relativeTestFile(file: string, root: string): string;
  buildTestId(file: string, chain: string[], seen: Map<string, number>): string;
  parseTestId(id: string): { file: string; name: string };
  normalizeTestArguments(args: unknown[]): { name: string; options: unknown; fn: unknown };
  selectTestFiles(files: string[], filter?: string[]): string[];
  mergeFileCoverage(files: { tests: string[]; staticCoverage?: Record<string, number>; perTest?: Record<string, Record<string, number>> }[]): {
    static: Record<string, number>;
    perTest: Record<string, Record<string, number>>;
  };
  killers(results: { id: string; status: string }[], disableBail: boolean): string[];
};
type Checker = {
  applyMutant(text: string, location: Location, replacement: string): string;
  positionOf(text: string, offset: number): { line: number; column: number };
  newDiagnostics(baseline: Set<string>, diagnostics: { fileName?: string; code: number; text: string; category: number }[]): unknown[];
  diagnosticKey(diagnostic: { fileName?: string; code: number; text: string }): string;
  overlayKey(file: string): string;
};

test("test IDs carry the file relative to out/test and number repeated names", async () => {
  const pure = await load<Pure>("scripts/mutation/node-test-pure.mjs");
  assert.equal(pure.relativeTestFile("C:\\repo\\out\\test\\core\\find\\a.test.js", "out/test"), "core/find/a.test.js");
  const seen = new Map<string, number>();
  assert.equal(pure.buildTestId("core/a.test.js", ["suite", "case"], seen), "core/a.test.js::suite > case");
  assert.equal(pure.buildTestId("core/a.test.js", ["suite", "case"], seen), "core/a.test.js::suite > case #2");
  assert.deepEqual(pure.parseTestId("core/a.test.js::suite > case"), { file: "core/a.test.js", name: "suite > case" });
  assert.equal(pure.normalizeTestArguments([{ skip: true }]).name, "<anonymous>");
});

test("a mutant run keeps only the files of the covering tests", async () => {
  const pure = await load<Pure>("scripts/mutation/node-test-pure.mjs");
  const files = ["core/a.test.js", "core/b.test.js"];
  assert.deepEqual(pure.selectTestFiles(files, ["core/b.test.js::x"]), ["core/b.test.js"]);
  assert.deepEqual(pure.selectTestFiles(files, undefined), files);
  assert.deepEqual(pure.killers([{ id: "t1", status: "failed" }, { id: "t2", status: "failed" }, { id: "t3", status: "success" }], true), ["t1", "t2"]);
  assert.deepEqual(pure.killers([{ id: "t1", status: "failed" }, { id: "t2", status: "failed" }], false), ["t1"]);
});

test("load-time coverage of a file is credited to each of its tests and to no global static set", async () => {
  const pure = await load<Pure>("scripts/mutation/node-test-pure.mjs");
  const merged = pure.mergeFileCoverage([
    { tests: ["a::one", "a::two"], staticCoverage: { "7": 1 }, perTest: { "a::one": { "3": 2 } } },
    { tests: ["b::three"], staticCoverage: {}, perTest: {} },
  ]);
  assert.deepEqual(merged.static, {});
  assert.deepEqual(merged.perTest, { "a::one": { "7": 1, "3": 2 }, "a::two": { "7": 1 }, "b::three": {} });
});

test("a mutant is applied at its 0-based location, over several lines", async () => {
  const checker = await load<Checker>("scripts/mutation/ts7-checker-pure.mjs");
  const text = "const a = 1;\nconst b = a + 2;\n";
  assert.equal(checker.applyMutant(text, { start: { line: 1, column: 10 }, end: { line: 1, column: 15 } }, "a - 2"), "const a = 1;\nconst b = a - 2;\n");
  assert.equal(checker.applyMutant(text, { start: { line: 0, column: 10 }, end: { line: 1, column: 7 } }, "0;\nconst c"), "const a = 0;\nconst c = a + 2;\n");
  assert.deepEqual(checker.positionOf(text, 19), { line: 2, column: 7 });
});

test("only error diagnostics that are not in the baseline make a mutant a compile error", async () => {
  const checker = await load<Checker>("scripts/mutation/ts7-checker-pure.mjs");
  const known = { fileName: "x.ts", code: 2322, text: "known", category: 1 };
  const baseline = new Set([checker.diagnosticKey(known)]);
  assert.deepEqual(checker.newDiagnostics(baseline, [known]), []);
  assert.equal(checker.newDiagnostics(baseline, [known, known]).length, 1, "a second copy of a baseline error is new");
  assert.equal(checker.newDiagnostics(baseline, [{ ...known, code: 2345 }]).length, 1);
  assert.deepEqual(checker.newDiagnostics(baseline, [{ ...known, code: 6133, category: 2 }]), [], "a warning is not an error");
  assert.equal(checker.overlayKey("C:\\Repo\\Src\\A.ts"), "c:/repo/src/a.ts");
});
