// scripts/select-acceptance-attempts.mjs: what `just ci-report` keeps of the downloaded artifacts of
// the acceptance shards.
import * as assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

const script = path.join(process.cwd(), "scripts", "select-acceptance-attempts.mjs");
const DOWNLOADS = "out/ci-artifacts/acceptance";
const REPORTS = "out/reports/acceptance";

const workspace = (): string => fs.mkdtempSync(path.join(os.tmpdir(), "acceptance-attempts-"));

function write(root: string, file: string, text: string): void {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, text);
}

/** The report of one group inside one downloaded artifact folder (`out/reports/` is its root). */
function download(root: string, artifact: string, group: string, text: string): void {
  write(root, `${DOWNLOADS}/${artifact}/acceptance/${group}/acceptance-manifest.json`, text);
}

function select(root: string): string {
  const result = spawnSync(process.execPath, [script], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

const kept = (root: string, group: string): string | undefined => {
  const file = path.join(root, REPORTS, group, "acceptance-manifest.json");
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : undefined;
};

// "Re-run failed jobs" leaves attempt 1 of one group beside later attempts of another.
// @tests_req SwRS-MDOKFSTUDIO-CORE-076#S9
test("each group keeps the reports of its newest attempt, compared as a number", () => {
  const root = workspace();
  download(root, "e2e-acceptance-trust-security-attempt-2", "trust-security", "trust 2");
  download(root, "e2e-acceptance-trust-security-attempt-10", "trust-security", "trust 10");
  download(root, "e2e-acceptance-trust-security-attempt-9", "trust-security", "trust 9");
  download(root, "e2e-acceptance-gfm-attempt-1", "gfm", "gfm 1");
  // What a download of the merged reports left there is replaced, files included.
  write(root, `${REPORTS}/trust-security/stale.json`, "stale");
  const output = select(root);
  assert.equal(kept(root, "trust-security"), "trust 10");
  assert.equal(kept(root, "gfm"), "gfm 1");
  assert.equal(fs.existsSync(path.join(root, REPORTS, "trust-security", "stale.json")), false);
  assert.match(output, /acceptance trust-security: kept attempt 10 \(e2e-acceptance-trust-security-attempt-10\)/u);
  assert.match(output, /acceptance gfm: kept attempt 1 /u);
});

// download-artifact extracts a single matching artifact straight into the destination folder.
// @tests_req SwRS-MDOKFSTUDIO-CORE-076#S9
test("the reports of a single downloaded artifact are read from the download folder itself", () => {
  const root = workspace();
  write(root, `${DOWNLOADS}/acceptance/trust-security/acceptance-manifest.json`, "only");
  const output = select(root);
  assert.equal(kept(root, "trust-security"), "only");
  assert.match(output, /acceptance trust-security: kept the only downloaded artifact/u);
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-076#S9
test("a newest attempt without a report leaves the group missing: no older attempt stands in", () => {
  const root = workspace();
  download(root, "e2e-acceptance-trust-security-attempt-1", "trust-security", "trust 1");
  // A shard that failed before it wrote its manifest uploads other reports only.
  write(root, `${DOWNLOADS}/e2e-acceptance-trust-security-attempt-2/log.txt`, "died");
  write(root, `${REPORTS}/trust-security/acceptance-manifest.json`, "older");
  const output = select(root);
  assert.equal(kept(root, "trust-security"), undefined);
  assert.match(output, /acceptance trust-security: attempt 2 .* holds no report of the group/u);
});

test("without any download a local report changes nothing", () => {
  const root = workspace();
  write(root, `${REPORTS}/trust-security/acceptance-manifest.json`, "local");
  assert.match(select(root), /no downloaded artifact to select from/u);
  assert.equal(kept(root, "trust-security"), "local");
});
