// Runs a Node test suite: `node scripts/node-test.mjs <suite> <pattern>...`. The spec report goes to
// stdout and the JUnit report to out/reports/<suite>/tests-<suite>.xml, whose folder is created
// first. Node expands the patterns itself, so no shell is involved: npm runs scripts with cmd.exe
// on Windows and with sh elsewhere.
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

const [suite, ...patterns] = process.argv.slice(2);
if (!suite || patterns.length === 0) {
  console.error("usage: node scripts/node-test.mjs <suite> <pattern>...");
  process.exit(2);
}
const reports = path.join("out", "reports", suite);
fs.mkdirSync(reports, { recursive: true });
const result = spawnSync(
  process.execPath,
  [
    "--import",
    "./scripts/register-myst-patches.mjs",
    "--test",
    "--test-reporter=spec",
    "--test-reporter-destination=stdout",
    "--test-reporter=junit",
    `--test-reporter-destination=${path.join(reports, `tests-${suite}.xml`)}`,
    ...patterns,
  ],
  { stdio: "inherit" },
);
if (result.error) throw result.error;
process.exit(result.status ?? 1);
