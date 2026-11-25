import * as assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

const script = path.resolve(__dirname, "../../..", "scripts", "check-marker-companions.mjs");
const CONFIG = [
  "version: 1",
  "scopes:",
  "  core:",
  "    id_token: CORE",
  "    folder: core",
  "    source_dirs:",
  "      - src",
  "    test_dirs:",
  "      - test",
  "",
].join("\n");

type Files = Record<string, string>;

const swrs = (id: string, lifecycle = "proposed", extra = ""): string =>
  `---\ntype: SwRS\nid: ${id}\nreq_lifecycle: ${lifecycle}\n${extra}---\n\n# ${id}\n`;
const ids = (count: number): string[] => Array.from({ length: count }, (_, i) => `SwRS-T-CORE-${String(i + 1).padStart(3, "0")}`);
const tests = (list: string[]): string => list.map((id) => `// @tests_req ${id}`).join("\n");

function runAt(root: string, args: string[] = []): { status: number | null; out: string } {
  const result = spawnSync(process.execPath, [script, "--root", root, ...args], { encoding: "utf8" });
  return { status: result.status, out: `${result.stdout}${result.stderr}` };
}

/** Runs the script on a scratch git repository holding `files`; the project's folders are never touched. */
function check(files: Files, args: string[] = []): { status: number | null; out: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "studio-markers-"));
  try {
    spawnSync("git", ["init", "-q"], { cwd: root });
    const all: Files = { "requirements/config.yml": CONFIG, ...files };
    for (const [file, content] of Object.entries(all)) {
      fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
      fs.writeFileSync(path.join(root, file), content);
    }
    return runAt(root, args);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test("rule 1: an in-force SwRS needs an @implements_req in a source dir", () => {
  const id = "SwRS-T-CORE-001";
  const requirement = (lifecycle: string, extra = ""): Files => ({ [`requirements/tiers/swrs/core/${id}.md`]: swrs(id, lifecycle, extra) });
  const bare = { "src/a.ts": "export const a = 1;\n" };

  const refused = check({ ...requirement("proposed"), ...bare });
  assert.equal(refused.status, 1);
  assert.match(refused.out, /SwRS-T-CORE-001 is in force and not exempt but no @implements_req marks it in src\//u);

  assert.equal(check({ ...requirement("proposed", "annotation_exemption: true\n"), ...bare }).status, 0);
  assert.equal(check({ ...requirement("superseded"), ...bare }).status, 0);

  const testOnly = check({ ...requirement("approved"), ...bare, "test/a.test.ts": `// @implements_req ${id}\n// @tests_req ${id}\n` });
  assert.equal(testOnly.status, 1, "a marker in test/ does not count");

  const marked = check({ ...requirement("draft"), "src/a.ts": `// @implements_req ${id}\nexport const a = 1;\n` });
  assert.equal(marked.status, 0, marked.out);
  assert.match(marked.out, /1 in-force SwRS marked/u);
});

test("rule 2: a marker block names at most 3 requirement IDs", () => {
  const four = check({ "src/a.ts": `${tests(ids(4))}\nexport const a = 1;\n` });
  assert.equal(four.status, 1);
  assert.match(four.out, /src\/a\.ts:1-4: a marker block names 4 requirement IDs \(at most 3\)/u);

  assert.equal(check({ "src/a.ts": `${tests(ids(3))}\nexport const a = 1;\n` }).status, 0);

  const [a, b, c, d, e, f] = ids(6);
  const twoBlocks = `${tests([a, b, c])}\nexport const x = 1;\n${tests([d, e, f])}\nexport const y = 2;\n`;
  assert.equal(check({ "src/a.ts": twoBlocks }).status, 0);

  const blank = check({ "src/a.ts": `${tests(ids(2))}\n\n${tests(ids(4).slice(2))}\nexport const a = 1;\n` });
  assert.equal(blank.status, 1, "a blank line does not end a block");
  const prose = check({ "src/a.ts": `${tests(ids(2))}\n/** Explains the next marker. */\n${tests(ids(4).slice(2))}\nexport const a = 1;\n` });
  assert.equal(prose.status, 1, "a prose comment line does not end a block");
  assert.match(prose.out, /names 4 requirement IDs/u);
});

const companion = (host: string, lines: string[]): string => `// Companion of: ${host}\n${lines.join("\n")}\nexport {};\n`;
const hostFiles: Files = {
  "src/host/main.ts": "export function scenarioPalette() {}\n",
  "src/host/other.ts": "export const scenarioMenu = 1;\n",
  "src/deep/sub/hidden.ts": "export const buried = 1;\n",
};
const reqFiles = (count: number): Files =>
  Object.fromEntries(ids(count).map((id) => [`requirements/tiers/swrs/core/${id}.md`, swrs(id, "superseded")]));

test("rule 3: a companion line names a scenario found in the host or its folder", () => {
  const [one] = ids(1);
  const files = (lines: string[], name = "src/host/main.markers.ts"): Files => ({ ...hostFiles, ...reqFiles(5), [name]: companion("src/host/main.ts", lines) });

  const unnamed = check(files([`// @tests_req ${one}`]));
  assert.equal(unnamed.status, 1);
  assert.match(unnamed.out, /:2: a companion marker names its scenario or code point after " — "/u);

  const absent = check(files([`// @tests_req ${one} — noSuchScenario`]));
  assert.equal(absent.status, 1);
  assert.match(absent.out, /"noSuchScenario" is found neither in src\/host\/main\.ts nor in its folder/u);

  const subfolder = check(files([`// @tests_req ${one} — buried`]));
  assert.equal(subfolder.status, 1, "a name found only in a subfolder of the host's folder does not count");

  assert.equal(check(files([`// @tests_req ${one} — scenarioPalette`])).status, 0);
  assert.equal(check(files([`// @tests_req ${one} — scenarioMenu`])).status, 0, "the host's folder counts");

  // Not named *.markers.ts: the `// Companion of:` line makes it a companion all the same.
  const plain = check(files([`// @tests_req ${one}`], "test/host/markers.ts"));
  assert.equal(plain.status, 1);
  assert.match(plain.out, /test\/host\/markers\.ts:2: a companion marker names its scenario/u);
});

test("rule 3 and rule 2: a named companion escapes the cap, one unnamed line brings it back", () => {
  const list = ids(5);
  const named = list.map((id) => `// @tests_req ${id} — scenarioPalette`);
  const base = { ...hostFiles, ...reqFiles(5) };

  const ok = check({ ...base, "src/host/main.markers.ts": companion("src/host/main.ts", named) });
  assert.equal(ok.status, 0, ok.out);

  const withUnnamed = [...named.slice(0, 4), `// @tests_req ${list[4]}`];
  const refused = check({ ...base, "src/host/main.markers.ts": companion("src/host/main.ts", withUnnamed) });
  assert.equal(refused.status, 1);
  assert.match(refused.out, /a companion marker names its scenario or code point/u);
  assert.match(refused.out, /a marker block names 5 requirement IDs \(at most 3\)/u);
});

const baselineOf = (root: string): { blocks: Record<string, number>; unnamedCompanionLines: Record<string, number> } =>
  JSON.parse(fs.readFileSync(path.join(root, "scripts", "marker-baseline.json"), "utf8"));
const writeBaseline = (root: string, blocks: Record<string, number>, unnamed: Record<string, number> = {}): void => {
  fs.mkdirSync(path.join(root, "scripts"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "scripts", "marker-baseline.json"),
    JSON.stringify({ description: "test", limit: 3, blocks, unnamedCompanionLines: unnamed }, null, 2),
  );
};

test("ratchet, blocks: a listed file may only shrink", () => {
  const list = ids(6);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "studio-markers-"));
  try {
    spawnSync("git", ["init", "-q"], { cwd: root });
    const put = (file: string, content: string): void => {
      fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
      fs.writeFileSync(path.join(root, file), content);
    };
    put("requirements/config.yml", CONFIG);
    put("src/a.ts", `${tests(list.slice(0, 4))}\nexport const a = 1;\n`);
    put("src/b.ts", "export const b = 1;\n");

    writeBaseline(root, { "src/a.ts": 4 });
    assert.equal(runAt(root).status, 0, "at the baseline");

    put("src/a.ts", `${tests(list.slice(0, 5))}\nexport const a = 1;\n`);
    const grew = runAt(root);
    assert.equal(grew.status, 1);
    assert.match(grew.out, /src\/a\.ts: 5 requirement IDs in over-limit marker blocks \(baseline 4\); a listed file may only shrink/u);

    put("src/a.ts", `${tests(list.slice(0, 4))}\nexport const a = 1;\n`);
    writeBaseline(root, { "src/a.ts": 6 });
    const shrank = runAt(root);
    assert.equal(shrank.status, 1);
    assert.match(shrank.out, /src\/a\.ts: shrank to 4 \(baseline 6\).*node scripts\/check-marker-companions\.mjs --update/u);
    assert.equal(runAt(root, ["--update"]).status, 0);
    assert.equal(baselineOf(root).blocks["src/a.ts"], 4);
    assert.equal(runAt(root).status, 0);

    // A file that got clean is stale; `--update` removes it and never adds the unlisted file.
    put("src/a.ts", "export const a = 1;\n");
    put("src/b.ts", `${tests(list.slice(0, 4))}\nexport const b = 1;\n`);
    const stale = runAt(root);
    assert.equal(stale.status, 1);
    assert.match(stale.out, /src\/a\.ts: clean or gone; remove it from scripts\/marker-baseline\.json/u);
    assert.match(stale.out, /src\/b\.ts:1-4: a marker block names 4 requirement IDs/u);
    const updated = runAt(root, ["--update"]);
    assert.equal(updated.status, 1, "the unlisted offender still fails after --update");
    assert.deepEqual(baselineOf(root).blocks, {}, "a.ts removed, b.ts not added");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("ratchet, unnamed companion lines: a listed companion may only shrink", () => {
  const list = ids(3);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "studio-markers-"));
  try {
    spawnSync("git", ["init", "-q"], { cwd: root });
    const put = (file: string, content: string): void => {
      fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
      fs.writeFileSync(path.join(root, file), content);
    };
    put("requirements/config.yml", CONFIG);
    for (const [file, content] of Object.entries({ ...hostFiles, ...reqFiles(3) })) put(file, content);
    const companionPath = "test/host/markers.ts";
    const write = (lines: string[]): void => put(companionPath, companion("src/host/main.ts", lines));
    const unnamed = (n: number): string[] => list.slice(0, n).map((id) => `// @tests_req ${id}`);

    write(unnamed(2));
    writeBaseline(root, {}, { [companionPath]: 2 });
    assert.equal(runAt(root).status, 0, "at the baseline");

    write(unnamed(3));
    const grew = runAt(root);
    assert.equal(grew.status, 1);
    assert.match(grew.out, /test\/host\/markers\.ts: 3 unnamed companion marker lines \(baseline 2\); a listed file may only shrink/u);

    write([...unnamed(1), `// @tests_req ${list[1]} — scenarioPalette`]);
    const shrank = runAt(root);
    assert.equal(shrank.status, 1);
    assert.match(shrank.out, /shrank to 1 \(baseline 2\)/u);
    assert.equal(runAt(root, ["--update"]).status, 0);
    assert.equal(baselineOf(root).unnamedCompanionLines[companionPath], 1);

    write(list.slice(0, 2).map((id) => `// @tests_req ${id} — scenarioPalette`));
    assert.equal(runAt(root).status, 1, "all named: the entry is stale");
    assert.equal(runAt(root, ["--update"]).status, 0);
    assert.deepEqual(baselineOf(root).unnamedCompanionLines, {});

    // --update never adds a file: an unnamed companion that is not listed keeps failing.
    put("test/host/other.ts", companion("src/host/main.ts", unnamed(1)));
    assert.equal(runAt(root, ["--update"]).status, 1);
    assert.deepEqual(baselineOf(root).unnamedCompanionLines, {});
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

const scenarios = (...list: string[]): string => `scenarios:\n${list.map((id) => `  - id: ${id}\n    title: Title of ${id}\n`).join("")}`;
const requirementFiles = (id: string, extra = ""): Files => ({ [`requirements/tiers/swrs/core/${id}.md`]: swrs(id, "superseded", extra) });
const strsFiles = (id: string, extra = ""): Files => ({
  [`requirements/tiers/strs/core/${id}.md`]: `---\ntype: StRS\nid: ${id}\nreq_lifecycle: proposed\n${extra}---\n\n# ${id}\n`,
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-097#S2
test("rule 4: a marker names a scenario declared in the target's scenarios:", () => {
  const [id] = ids(1);
  const declared = requirementFiles(id, scenarios("S1", "S2"));
  const marked = (marker: string): Files => ({ ...declared, "test/a.test.ts": `${marker}\n` });

  const undeclared = check(marked(`// @tests_req ${id}#S3`));
  assert.equal(undeclared.status, 1);
  assert.match(undeclared.out, new RegExp(`test/a\.test\.ts:1: fragment-undeclared: @tests_req ${id}#S3 `, "u"));
  assert.equal(check(marked(`// @tests_req ${id}#S0`)).status, 1, "S0 is not an id");
  assert.equal(check(marked(`// @tests_req ${id}#S1`)).status, 0);
  assert.equal(check(marked(`// @tests_req ${id}#S2`)).status, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-097#S3
test("rule 4: a marker on a target with scenarios: has a fragment, on a target without has none", () => {
  const [id, bare] = ids(2);
  const files: Files = { ...requirementFiles(id, scenarios("S1")), ...requirementFiles(bare) };

  const missing = check({ ...files, "test/a.test.ts": `// @tests_req ${id}\n` });
  assert.equal(missing.status, 1);
  assert.match(missing.out, new RegExp(`test/a\.test\.ts:1: fragment-required: @tests_req ${id} `, "u"));

  const unexpected = check({ ...files, "test/a.test.ts": `// @tests_req ${bare}#S1\n` });
  assert.equal(unexpected.status, 1);
  assert.match(unexpected.out, new RegExp(`test/a\.test\.ts:1: fragment-unexpected: @tests_req ${bare}#S1 `, "u"));

  assert.equal(check({ ...files, "test/a.test.ts": `// @tests_req ${id}#S1\n// @tests_req ${bare}\n` }).status, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-097#S3
test("rule 4: an @implements_req never has a fragment", () => {
  const [id] = ids(1);
  const files: Files = requirementFiles(id, scenarios("S1"));

  const wrong = check({ ...files, "src/a.ts": `// @implements_req ${id}#S1\n` });
  assert.equal(wrong.status, 1);
  assert.match(wrong.out, new RegExp(`src/a\.ts:1: implements-fragment: @implements_req ${id}#S1 `, "u"));
  assert.equal(check({ ...files, "src/a.ts": `// @implements_req ${id}\n` }).status, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-097#S1
test("rule 2 and rule 4: two fragments of one ID count as one ID in a marker block", () => {
  const [one, two, three] = ids(3);
  const files: Files = { ...requirementFiles(one, scenarios("S1", "S2")), ...requirementFiles(two), ...requirementFiles(three) };
  const block = [`// @tests_req ${one}#S1`, `// @tests_req ${one}#S2`, `// @tests_req ${two}`, `// @tests_req ${three}`].join("\n");
  const result = check({ ...files, "test/a.test.ts": `${block}\ntest("x", () => {});\n` });
  assert.equal(result.status, 0, result.out);

  const acceptance = "StRS-T-CORE-001";
  const withAccepts = check({ ...files, ...strsFiles(acceptance), "test/integration/a.test.ts": `${block}\n// @accepts_req ${acceptance}\ntest("x", () => {});\n` });
  assert.equal(withAccepts.status, 1, "an @accepts_req marker joins the block");
  assert.match(withAccepts.out, /a marker block names 4 requirement IDs \(at most 3\)/u);
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-097#S4
test("rule 5: @accepts_req sits under test/integration/, except for the StRS of products other than the editor", () => {
  const strs = "StRS-T-CORE-001";
  const outside = "StRS-T-CORE-007";
  const files: Files = { ...strsFiles(strs), ...strsFiles(outside) };

  const refused = check({ ...files, "test/visual/a.test.ts": `// @accepts_req ${strs}\n` });
  assert.equal(refused.status, 1);
  assert.match(refused.out, new RegExp(`test/visual/a\.test\.ts:1: accepts-placement: @accepts_req ${strs} `, "u"));
  assert.equal(check({ ...files, "src/a.ts": `// @accepts_req ${strs}\n` }).status, 1, "never in src");

  assert.equal(check({ ...files, "test/integration/a.test.ts": `// @accepts_req ${strs}\n` }).status, 0);
  assert.equal(check({ ...files, "test/build/a.test.ts": `// @accepts_req ${outside}\n` }).status, 0, "CORE-007 is accepted on its bench");
  assert.equal(check({ ...files, "test/visual/a.test.ts": `// @accepts_req ${outside}\n` }).status, 1, "only under build, security, site or core");
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-097#S5
test("rule 5: @accepts_req never targets a SwRS", () => {
  const [id] = ids(1);
  const result = check({ ...requirementFiles(id), "test/integration/a.test.ts": `// @accepts_req ${id}\n` });
  assert.equal(result.status, 1);
  assert.match(result.out, new RegExp(`test/integration/a\.test\.ts:1: accepts-on-swrs: @accepts_req ${id} `, "u"));
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-097#S6
test("rule 5: no @tests_req StRS under test/integration/, and the baseline holds the existing ones", () => {
  const strs = "StRS-T-CORE-001";
  const files: Files = { ...strsFiles(strs), "test/integration/a.test.ts": `// @tests_req ${strs}\n` };

  const refused = check(files);
  assert.equal(refused.status, 1);
  assert.match(refused.out, new RegExp(`test/integration/a\.test\.ts:1: strs-tests-in-integration: @tests_req ${strs} `, "u"));
  assert.equal(check({ ...files, "test/integration/a.test.ts": "", "test/visual/a.test.ts": `// @tests_req ${strs}\n` }).status, 0, "a simulated bench may test a StRS path");

  const root = fs.mkdtempSync(path.join(os.tmpdir(), "studio-markers-"));
  try {
    spawnSync("git", ["init", "-q"], { cwd: root });
    for (const [file, content] of Object.entries({ "requirements/config.yml": CONFIG, ...files })) {
      fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
      fs.writeFileSync(path.join(root, file), content);
    }
    fs.mkdirSync(path.join(root, "scripts"), { recursive: true });
    const write = (count: number): void =>
      fs.writeFileSync(path.join(root, "scripts", "marker-baseline.json"), JSON.stringify({ blocks: {}, unnamedCompanionLines: {}, strsTestsInIntegration: { "test/integration/a.test.ts": count } }));
    write(1);
    assert.equal(runAt(root).status, 0, "listed at its count");
    write(2);
    assert.match(runAt(root).out, /shrank to 1 \(baseline 2\)/u);
    write(0);
    assert.match(runAt(root).out, /: 1 @tests_req StRS markers under test\/integration\/ \(baseline 0\)/u);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// @tests_req SwRS-MDOKFSTUDIO-CORE-097#S2
// @tests_req SwRS-MDOKFSTUDIO-CORE-097#S3
test("rules 4 and 5 read companion marker lines too, and print one line per failure", () => {
  const [id] = ids(1);
  const result = check({
    ...hostFiles,
    ...requirementFiles(id, scenarios("S1")),
    "src/host/main.markers.ts": companion("src/host/main.ts", [`// @tests_req ${id} — scenarioPalette`, `// @tests_req ${id}#S2 — scenarioPalette`]),
  });
  assert.equal(result.status, 1);
  assert.match(result.out, /main\.markers\.ts:2: fragment-required: @tests_req SwRS-T-CORE-001 /u);
  assert.match(result.out, /main\.markers\.ts:3: fragment-undeclared: @tests_req SwRS-T-CORE-001#S2 /u);
});
