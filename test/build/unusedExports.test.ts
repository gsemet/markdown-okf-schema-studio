import * as assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

const projectRoot = path.resolve(__dirname, "../../..");
const script = path.join(projectRoot, "scripts", "check-unused-exports.mjs");

interface Checker {
  exportedNames(source: string): Set<string>;
  findUnusedExports(
    files: Record<string, string>,
    allowlist?: Record<string, Record<string, string>>,
  ): { problems: string[] };
}

async function loadChecker(): Promise<Checker> {
  return (await import(pathToFileURL(script).href)) as Checker;
}

test("exportedNames lists runtime exports and skips types", async () => {
  const { exportedNames } = await loadChecker();
  const names = exportedNames(
    [
      "export const A = 1;",
      "export async function b() {}",
      "export class C {}",
      "export interface D {}",
      "export type E = string;",
      "export { f, g as h, type I };",
      "export type { J };",
      "export { k } from './k';",
    ].join("\n"),
  );
  assert.deepEqual([...names].sort(), ["A", "C", "b", "f", "h"]);
});

test("findUnusedExports flags an export no other module mentions", async () => {
  const { findUnusedExports } = await loadChecker();
  const files = {
    "src/a.ts": "export function used() {}\nexport function dead() {}\n",
    "src/b.ts": 'import { used } from "./a";\nused();\n',
    "test/a.test.ts": "const unrelatedDeadly = 1;\n",
  };
  const { problems } = findUnusedExports(files);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /src\/a\.ts: export "dead"/u);
});

test("findUnusedExports counts a test as a consumer and an allow-list entry as an exception", async () => {
  const { findUnusedExports } = await loadChecker();
  const files = {
    "src/a.ts": "export const forTest = 1;\nexport const entry = 2;\n",
    "test/a.test.ts": "forTest;\n",
  };
  assert.deepEqual(findUnusedExports(files, { "src/a.ts": { entry: "loaded by name" } }).problems, []);
});

test("findUnusedExports rejects an allow-list entry that is used or no longer exists", async () => {
  const { findUnusedExports } = await loadChecker();
  const files = { "src/a.ts": "export const used = 1;\n", "src/b.ts": "used;\n" };
  const { problems } = findUnusedExports(files, {
    "src/a.ts": { used: "x", gone: "y" },
    "src/missing.ts": { name: "z" },
  });
  assert.equal(problems.length, 3);
  assert.match(problems.join("\n"), /"used" is not needed/u);
  assert.match(problems.join("\n"), /"gone" names an export that does not exist/u);
  assert.match(problems.join("\n"), /missing\.ts: allow-list entry "name"/u);
});

test("the repository has no unused export", () => {
  const result = spawnSync(process.execPath, [script], { cwd: projectRoot, encoding: "utf8" });
  assert.equal(result.status, 0, `${result.stderr}${result.stdout}`);
});
