import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import test from "node:test";

const ROOT = path.resolve(__dirname, "../../..");
/** Suites run by other scripts: window tests (test:integration) and the security suite (test:security). */
const OTHER_RUNNERS = ["integration/", "security/"];

function listTests(directory: string, prefix = ""): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? listTests(path.join(directory, entry.name), `${prefix}${entry.name}/`)
      : entry.name.endsWith(".test.js") ? [`${prefix}${entry.name}`] : []);
}

test("every compiled unit test file is matched by a test:unit glob", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")) as {
    scripts: Record<string, string>;
  };
  const globs = [...manifest.scripts["test:unit"].matchAll(/'(out\/test\/[^']+)'/g)].map((match) => match[1]);
  assert.ok(globs.length > 0, "test:unit lists its globs in single quotes");
  const unmatched = listTests(path.join(ROOT, "out", "test"))
    .filter((file) => !OTHER_RUNNERS.some((prefix) => file.startsWith(prefix)))
    .filter((file) => !globs.some((glob) => path.matchesGlob(`out/test/${file}`, glob)));
  assert.deepEqual(unmatched, [], "these *.test.js files run in no test:unit glob");
});
