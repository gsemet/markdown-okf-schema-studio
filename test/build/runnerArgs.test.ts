// The decisions of the integration launcher that need no VS Code: its arguments, the acceptance
// files it runs, the window each file asks for and the campaign identity of a run.
import * as assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { test } from "node:test";

import { ACCEPTANCE_SOURCE_DIR, pinnedRunIdOf, selectAcceptanceFiles, windowKindOf } from "../shared/acceptanceCampaign";
import { parseRunnerArgs } from "../shared/runnerArgs";

// @tests_req SwRS-MDOKFSTUDIO-CORE-076#S7
test("--acceptance-only asks for the acceptance files, of one group with --group", () => {
  assert.deepEqual(parseRunnerArgs(["--acceptance-only"]), { mode: "acceptance" });
  assert.deepEqual(parseRunnerArgs(["--acceptance-only", "--group", "trust-security"]), { mode: "acceptance", group: "trust-security" });
  assert.deepEqual(parseRunnerArgs(["--group", "diagrams", "--acceptance-only"]), { mode: "acceptance", group: "diagrams" });
  // The acceptance mode wins over a suite flag: it runs the acceptance files and nothing else.
  assert.deepEqual(parseRunnerArgs(["--reload-only", "--acceptance-only"]), { mode: "acceptance" });
});

test("without --acceptance-only the launcher runs the integration suites its flags name", () => {
  assert.deepEqual(parseRunnerArgs([]), { mode: "integration", suites: "all", scope: "all" });
  for (const scope of ["reload", "trusted", "reverse-migration", "untrusted", "scroll"] as const) {
    assert.deepEqual(parseRunnerArgs([`--${scope}-only`]), { mode: "integration", suites: scope, scope });
  }
  // With two flags, what runs and what the manifest records keep their own precedence.
  assert.deepEqual(parseRunnerArgs(["--untrusted-only", "--reverse-migration-only"]),
    { mode: "integration", suites: "reverse-migration", scope: "untrusted" });
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-076#S7
test("a --group the launcher cannot honour is refused", () => {
  for (const [args, message] of [
    [["--acceptance-only", "--group=diagrams"], /not `--group=<id>`/u],
    [["--acceptance-only", "--group"], /needs an e2e group id, got nothing\. Groups .*trust-security/u],
    [["--acceptance-only", "--group", ""], /got ""/u],
    [["--acceptance-only", "--group", "nope"], /got "nope"/u],
    [["--acceptance-only", "--group", "--trusted-only"], /got "--trusted-only"/u],
    [["--acceptance-only", "--group", "diagrams", "--group", "gfm"], /given twice/u],
    [["--group", "diagrams"], /add --acceptance-only/u],
  ] as const) {
    assert.throws(() => parseRunnerArgs(args), message, args.join(" "));
  }
});

// The refusal comes before any VS Code is downloaded or started: the process ends at once.
// @tests_req SwRS-MDOKFSTUDIO-CORE-076#S7
test("the launcher process refuses an unknown group at once and names the groups", () => {
  const launcher = path.join(process.cwd(), "out", "test", "integration", "run-tests.js");
  const result = spawnSync(process.execPath, [launcher, "--acceptance-only", "--group", "nope"], { encoding: "utf8", timeout: 60_000 });
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /--group needs an e2e group id, got "nope"/u);
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-076#S7
test("the acceptance files are selected by group, in the group order", () => {
  const names = ["trust-security.vsix.acceptance.ts", "support.ts", "trust-security.acceptance.ts", "gfm.acceptance.ts"];
  assert.deepEqual(selectAcceptanceFiles(names), [
    { name: "gfm.acceptance", group: "gfm" },
    { name: "trust-security.acceptance", group: "trust-security" },
    { name: "trust-security.vsix.acceptance", group: "trust-security" },
  ]);
  assert.deepEqual(selectAcceptanceFiles(names, "gfm"), [{ name: "gfm.acceptance", group: "gfm" }]);
  assert.throws(() => selectAcceptanceFiles(names, "diagrams"), /Group diagrams has no acceptance file/u);
  assert.throws(() => selectAcceptanceFiles(["support.ts"]), /No acceptance file under test\/integration\/acceptance\//u);
  // A file that names no group would never run in its CI shard: it fails the run.
  for (const wrong of ["trust.acceptance.ts", "gfm.two.parts.acceptance.ts", "Gfm.acceptance.ts"]) {
    assert.throws(() => selectAcceptanceFiles([...names, wrong], "gfm"), /is not named <group>/u, wrong);
  }
});

test("a file declares its window kind once, as the line the launcher reads", () => {
  assert.equal(windowKindOf('import x;\r\nexport const windowKind: WindowKind = "vsix";\r\n', "a"), "vsix");
  assert.equal(windowKindOf('export const windowKind = "restricted";\n', "a"), "restricted");
  for (const source of [
    "export const other = 1;\n",
    'export const windowKind = "untrusted";\n',
    '// export const windowKind = "trusted";\n',
    'export const windowKind = "trusted";\nexport const windowKind = "vsix";\n',
  ]) {
    assert.throws(() => windowKindOf(source, "x.acceptance.ts"), /x\.acceptance\.ts must declare its window once/u, source);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-076#S7
test("every acceptance file of the repository is named after a group and declares its window", () => {
  const folder = path.join(process.cwd(), ACCEPTANCE_SOURCE_DIR);
  const files = selectAcceptanceFiles(fs.readdirSync(folder));
  const windows = Object.fromEntries(files.map((file) =>
    [file.name, windowKindOf(fs.readFileSync(path.join(folder, `${file.name}.ts`), "utf8"), file.name)]));
  assert.equal(windows["trust-security.acceptance"], "trusted");
  assert.equal(windows["trust-security.restricted.acceptance"], "restricted");
  assert.equal(windows["trust-security.vsix.acceptance"], "vsix");
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-076#S9
test("a run is pinned only by the campaign file of its own CI run", () => {
  const campaign = { runId: "4242", startedAt: "2026-11-26T10:00:00.000Z", pinnedRunId: true };
  const environment = { STUDIO_E2E_RUN_ID: "4242", STUDIO_E2E_STARTED_AT: campaign.startedAt };
  assert.equal(pinnedRunIdOf(campaign, environment), true);
  for (const other of [
    undefined,
    null,
    "4242",
    { ...campaign, pinnedRunId: undefined },
    { ...campaign, runId: "4243" },
    { ...campaign, startedAt: "2026-11-25T10:00:00.000Z" },
  ]) {
    assert.equal(pinnedRunIdOf(other, environment), false, JSON.stringify(other));
  }
  assert.equal(pinnedRunIdOf(campaign, {}), false);
});
