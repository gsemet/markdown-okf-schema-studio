/**
 * Requirement markers (`just check-markers`).
 *
 * A marker is a link from a requirement to the code or test that carries it
 * (`@implements_req <ID>`, `@tests_req <ID>`, `@accepts_req <StRS-ID>`), with an optional `#S<n>`
 * fragment naming one scenario of the requirement (`@tests_req <ID>#S<n>`). The check holds the
 * rules below and a ratchet.
 *
 * Marker block: the requirement markers that sit together with no line of code between them.
 * Several one-ID marker comments above one declaration or one test form one block, even when blank
 * lines or prose comment lines (a JSDoc, an explanation) separate them; only a code line ends a
 * block. A block names at most 3 distinct requirement IDs. To mark more, put each marker at the
 * code or test it names: on another declaration, or inside the test body that checks it.
 * Technically: a marker line is a line okfreq reads as one; a comment line starts (trimmed) with
 * `//`, `#`, `/*`, `*` or `<!--`, or ends with `*` + `/` or `-->`; a blank line is empty after
 * trimming; every other line is a code line. A block is a maximal run of marker, comment and blank
 * lines that holds at least one marker line.
 *
 * Companion marker file: a tracked file under `src/` or `test/` named `*.markers.ts` or holding a
 * `// Companion of: <path>` line. It holds markers that cannot live in the file they belong to. It
 * names an existing host file, holds only comment lines and `export {};`, marks only existing
 * requirement ids, and holds at least one marker.
 *
 * 1. Source marker on every SwRS. An in-force (`draft`, `proposed`, `approved`) SwRS whose
 *    `annotation_exemption` is not `true` has its ID in at least one `@implements_req` marker line
 *    of a file under the source dirs of `requirements/config.yml`. No baseline.
 * 2. At most 3 IDs per marker block, in every tracked file under the source and test dirs of the
 *    config. A companion whose marker lines all pass rule 3 is not held to it.
 * 3. A companion marker line is `// @tests_req <ID> — <scenario>` or
 *    `// @implements_req <ID> — <code point>`; the name occurs as text in the host file or in a
 *    file directly in the host's folder.
 *
 * 4. Fragments (the new-mode rules of okfreq, enforced while the bundle is still in the old mode).
 *    A `#S<n>` fragment names a scenario declared in the `scenarios:` of the target; a marker on a
 *    target that declares `scenarios:` has a fragment, and a marker on a target that declares none
 *    has none (`fragment-undeclared`, `fragment-required`, `fragment-unexpected`). The ID-exists
 *    check and the 3-ID cap of rule 2 use the ID without its fragment.
 * 5. Benches. `@accepts_req` appears only under `test/integration/` (a StRS path walked in real VS
 *    Code), except for the StRS of ACCEPTANCE_OUTSIDE_VSCODE (CORE-007, CORE-008, TRUST-014), which
 *    may sit under `test/build`, `test/security`, `test/site` or `test/core`; it never targets a
 *    SwRS (`accepts-placement`, `accepts-on-swrs`). No `@tests_req StRS-...` sits under
 *    `test/integration/` (`strs-tests-in-integration`).
 *    Each failure of rules 4 and 5 prints `<path>:<line>: <rule>: <marker>`.
 *
 * Ratchet (`scripts/marker-baseline.json`): `blocks` (rule 2: the sum of IDs over the over-limit
 * blocks of a file) and `unnamedCompanionLines` (rule 3: the unnamed marker lines of a companion)
 * list what was already wrong; a listed file may only shrink. The check fails when a listed file
 * grows, when an unlisted file breaks a rule and when an entry is stale; `--update` lowers or
 * removes stale entries, never raises one or adds a file. `--root <dir>` runs it on another
 * repository root.
 *
 * Files are the ones git tracks or would track (`.gitignore` applies).
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { parse as parseYaml } from "yaml";

/** Maximum distinct requirement IDs in one marker block. */
export const BLOCK_LIMIT = 3;
const IN_FORCE = new Set(["draft", "proposed", "approved"]);
const MARKER = /^\s*(?:(?:#|\/\/|\/\*|\*|<!--)\s*)?(@implements_req|@tests_req|@accepts_req)\s+([A-Za-z][A-Za-z0-9_-]*)(?:#([^\s,;:)*]*))?/u;
/** The StRS that a real VS Code walk cannot reach: the release, the site and the built VSIX. */
export const ACCEPTANCE_OUTSIDE_VSCODE = /^StRS-[A-Za-z0-9]+-(?:CORE-007|CORE-008|TRUST-014)$/u;
const ACCEPTANCE_DIRS = ["test/integration"];
const ACCEPTANCE_OUTSIDE_DIRS = ["test/build", "test/security", "test/site", "test/core"];
const FRAGMENT = /^S[1-9][0-9]*$/u;
/** The rule whose offenders existed before this check and sit on the baseline until the marker sort removes them. */
const RATCHETED_RULE = "strs-tests-in-integration";

/** The marker of a line as okfreq reads it, or undefined. `fragment` is the text after `#`, if any; `text` the marker itself. */
export function parseMarker(line) {
  const match = MARKER.exec(line.replace(/\r$/u, ""));
  if (!match) return undefined;
  const text = `${match[1]} ${match[2]}${match[3] === undefined ? "" : `#${match[3]}`}`;
  return { kind: match[1], id: match[2], fragment: match[3], text };
}

/** `marker`, `comment`, `blank` or `code`. */
export function classifyLine(line) {
  if (parseMarker(line)) return "marker";
  const trimmed = line.replace(/\r$/u, "").trim();
  if (trimmed === "") return "blank";
  if (/^(\/\/|#|\/\*|\*|<!--)/u.test(trimmed) || trimmed.endsWith("*/") || trimmed.endsWith("-->")) return "comment";
  return "code";
}

/** The marker blocks of a text: `{ first, last, ids }` (1-based, first to last marker line). */
export function markerBlocks(text) {
  const blocks = [];
  let current;
  text.split("\n").forEach((line, index) => {
    const kind = classifyLine(line);
    if (kind === "code") {
      current = undefined;
    } else if (kind === "marker") {
      if (!current) {
        current = { first: index + 1, last: index + 1, ids: new Set() };
        blocks.push(current);
      }
      current.last = index + 1;
      current.ids.add(parseMarker(line).id);
    }
  });
  return blocks;
}

function git(root, args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 1 << 28 })
    .split("\0")
    .filter(Boolean);
}

function trackedFiles(root, ...folders) {
  const listed = git(root, ["ls-files", "--cached", "--others", "--exclude-standard", "-z", ...folders]);
  return [...new Set(listed)].filter((file) => existsSync(path.join(root, file))).sort();
}

const insideDirs = (file, dirs) => dirs.some((dir) => file === dir || file.startsWith(`${dir.replace(/\/$/u, "")}/`));

/** The union of the source dirs and of the test dirs of every scope of `requirements/config.yml`. */
export function readScopes(root) {
  const config = parseYaml(readFileSync(path.join(root, "requirements", "config.yml"), "utf8"));
  const sourceDirs = new Set();
  const testDirs = new Set();
  for (const scope of Object.values(config.scopes ?? {})) {
    for (const dir of scope.source_dirs ?? []) sourceDirs.add(dir);
    for (const dir of scope.test_dirs ?? []) testDirs.add(dir);
  }
  return { sourceDirs: [...sourceDirs], testDirs: [...testDirs] };
}

function frontmatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/u.exec(text);
  return match ? (parseYaml(match[1]) ?? {}) : {};
}

/** Every requirement of `requirements/tiers`: ID to `{ tier, scenarios }` (`scenarios` is a Set of ids, or undefined). */
export function readRequirements(root) {
  const requirements = new Map();
  for (const file of trackedFiles(root, "requirements/tiers")) {
    const id = /(?:StRS|SwRS)-[A-Za-z0-9]+-[A-Z]+-\d+(?=\.md$)/u.exec(file)?.[0];
    if (!id) continue;
    const text = readFileSync(path.join(root, file), "utf8");
    let scenarios;
    if (text.includes("scenarios:")) {
      const declared = frontmatter(text).scenarios;
      if (Array.isArray(declared)) scenarios = new Set(declared.map((entry) => String(entry?.id)));
    }
    requirements.set(id, { tier: id.startsWith("StRS-") ? "StRS" : "SwRS", scenarios });
  }
  return requirements;
}

// @implements_req SwRS-MDOKFSTUDIO-CORE-097
/**
 * Rules 4 and 5 on one line: `{ rule, message }`, the message being `<path>:<line>: <rule>: <marker> (<why>)`. `file` is the
 * repository-relative path, `number` the 1-based line number.
 */
export function checkMarkerRules(file, number, line, requirements) {
  const marker = parseMarker(line);
  if (!marker || marker.kind === "@implements_req") return [];
  const target = requirements.get(marker.id);
  if (!target) return [];
  const fail = (rule, why) => ({ rule, message: `${file}:${number}: ${rule}: ${marker.text} (${why})` });
  const problems = [];
  if (marker.kind === "@accepts_req") {
    const outside = ACCEPTANCE_OUTSIDE_VSCODE.test(marker.id) && insideDirs(file, ACCEPTANCE_OUTSIDE_DIRS);
    if (target.tier === "SwRS") {
      problems.push(fail("accepts-on-swrs", "@accepts_req targets a StRS path; a SwRS test uses @tests_req <SwRS-ID>#S<n>"));
    } else if (!insideDirs(file, ACCEPTANCE_DIRS) && !outside) {
      problems.push(fail("accepts-placement", "@accepts_req sits under test/integration/; CORE-007, CORE-008 and TRUST-014 may sit under test/build, test/security, test/site or test/core"));
    }
  } else if (target.tier === "StRS" && insideDirs(file, ACCEPTANCE_DIRS)) {
    problems.push(fail(RATCHETED_RULE, "a StRS path walked in real VS Code is an @accepts_req; test/integration/ holds no @tests_req StRS"));
  }
  if (target.scenarios === undefined) {
    if (marker.fragment !== undefined) problems.push(fail("fragment-unexpected", `${marker.id} declares no scenarios:; write the marker without a fragment`));
  } else if (marker.fragment === undefined) {
    problems.push(fail("fragment-required", `${marker.id} declares scenarios:; name the one this marker checks with #S<n>`));
  } else if (!FRAGMENT.test(marker.fragment) || !target.scenarios.has(marker.fragment)) {
    problems.push(fail("fragment-undeclared", `a #S<n> fragment names a scenario declared in the scenarios: of ${marker.id}: ${[...target.scenarios].join(", ")}`));
  }
  return problems;
}

/** Rule 1: the in-force, non-exempt SwRS with no `@implements_req` in a source dir. */
export function checkSourceMarkers(root, sourceDirs) {
  const marked = new Set();
  for (const file of trackedFiles(root, ...sourceDirs)) {
    if (!insideDirs(file, sourceDirs)) continue;
    for (const line of readFileSync(path.join(root, file), "utf8").split("\n")) {
      const marker = parseMarker(line);
      if (marker?.kind === "@implements_req") marked.add(marker.id);
    }
  }
  const problems = [];
  let inForce = 0;
  const swrs = trackedFiles(root, "requirements/tiers/swrs").filter((file) => /\/SwRS-[^/]+\.md$/u.test(file));
  for (const file of swrs) {
    const data = frontmatter(readFileSync(path.join(root, file), "utf8"));
    if (!IN_FORCE.has(data.req_lifecycle) || data.annotation_exemption === true) continue;
    inForce += 1;
    const id = path.posix.basename(file, ".md");
    if (!marked.has(id)) {
      problems.push(`${file}: ${id} is in force and not exempt but no @implements_req marks it in ${sourceDirs.map((dir) => `${dir}/`).join(", ")} (put the marker at the code that produces the behaviour)`);
    }
  }
  return { problems, inForce };
}

function isCompanion(file, text) {
  return (
    (file.startsWith("src/") || file.startsWith("test/")) &&
    (file.endsWith(".markers.ts") || /^\/\/ Companion of:/mu.test(text))
  );
}

function hostOf(lines) {
  return lines.map((line) => /^\/\/ Companion of: (\S+)\s*$/u.exec(line)?.[1]).find(Boolean);
}

/** Whether `name` occurs in the host file or in a file directly in its folder (not the companion). */
function nameFound(root, companion, host, name) {
  const hostDir = path.posix.dirname(host);
  const candidates = new Set([host]);
  const dirPath = path.join(root, hostDir);
  if (existsSync(dirPath)) {
    for (const entry of readdirSync(dirPath)) {
      const rel = hostDir === "." ? entry : `${hostDir}/${entry}`;
      if (statSync(path.join(root, rel)).isFile()) candidates.add(rel);
    }
  }
  candidates.delete(companion);
  for (const candidate of candidates) {
    if (readFileSync(path.join(root, candidate), "utf8").includes(name)) return true;
  }
  return false;
}

/**
 * Check one companion: the structural `problems`, and the rule 3 findings (`unnamed`, a list of
 * messages) kept apart so the ratchet can count them.
 */
export function checkCompanion(root, file, requirementIds) {
  const lines = readFileSync(path.join(root, file), "utf8").split("\n");
  const problems = [];
  const unnamed = [];
  const host = hostOf(lines);
  if (!host) {
    problems.push(`${file}: no "// Companion of: <path>" line naming the host file`);
  } else if (!existsSync(path.join(root, host))) {
    problems.push(`${file}: the host file ${host} does not exist (the companion outlived the file it marks)`);
  }
  let markers = 0;
  lines.forEach((raw, index) => {
    const where = `${file}:${index + 1}`;
    const trimmed = raw.trim();
    if (trimmed !== "" && !trimmed.startsWith("//") && trimmed !== "export {};") {
      problems.push(`${where}: a companion holds only comment lines and "export {};"`);
    }
    const marker = /^\/\/ @(implements_req|tests_req|accepts_req) ([^\s#]+)(?:#\S*)?(.*)$/u.exec(trimmed);
    if (!marker) {
      if (/@(implements_req|tests_req|accepts_req)\b/u.test(trimmed)) problems.push(`${where}: malformed marker`);
      return;
    }
    markers += 1;
    if (!requirementIds.has(marker[2])) problems.push(`${where}: ${marker[2]} is not a requirement of requirements/tiers/`);
    const named = /^ — (\S.*)$/u.exec(marker[3]);
    if (!named) {
      unnamed.push(`${where}: a companion marker names its scenario or code point after " — "`);
    } else if (host && existsSync(path.join(root, host)) && !nameFound(root, file, host, named[1].trim())) {
      unnamed.push(`${where}: "${named[1].trim()}" is found neither in ${host} nor in its folder`);
    }
  });
  if (markers === 0) problems.push(`${file}: no marker (delete the companion)`);
  return { problems, unnamed };
}

function readBaseline(baselinePath) {
  if (!existsSync(baselinePath)) return { blocks: {}, unnamedCompanionLines: {}, strsTestsInIntegration: {} };
  const parsed = JSON.parse(readFileSync(baselinePath, "utf8"));
  return {
    blocks: parsed.blocks ?? {},
    unnamedCompanionLines: parsed.unnamedCompanionLines ?? {},
    strsTestsInIntegration: parsed.strsTestsInIntegration ?? {},
  };
}

function writeBaseline(baselinePath, baseline) {
  const sort = (map) => Object.fromEntries(Object.entries(map).sort(([a], [b]) => a.localeCompare(b)));
  const document = {
    description: "Requirement markers that were already wrong when the gate started (see scripts/check-marker-companions.mjs). "
      + "blocks: files with a marker block of more than 3 requirement IDs, with the sum of IDs over their over-limit blocks. "
      + "unnamedCompanionLines: companion files with marker lines that do not name their scenario or code point. "
      + "strsTestsInIntegration: test/integration files that hold @tests_req StRS markers (to be sorted into @accepts_req or removed), with their count. "
      + "They may only shrink: lower an entry when its file improves (node scripts/check-marker-companions.mjs --update) "
      + "and remove it once the file is clean. Never add a file or raise a number.",
    limit: BLOCK_LIMIT,
    blocks: sort(baseline.blocks),
    unnamedCompanionLines: sort(baseline.unnamedCompanionLines),
    strsTestsInIntegration: sort(baseline.strsTestsInIntegration),
  };
  writeFileSync(baselinePath, JSON.stringify(document, null, 2) + "\n", "utf8");
}

/** Ratchet one map: `counts` file to current count, `detail` file to the messages of an unlisted file. */
function ratchet({ counts, detail, listed, what, errors, stale }) {
  for (const [file, count] of counts) {
    const recorded = listed[file];
    if (recorded === undefined) errors.push(...detail.get(file));
    else if (count > recorded) errors.push(`${file}: ${count} ${what} (baseline ${recorded}); a listed file may only shrink`);
    else if (count < recorded) stale.set(file, count);
  }
  for (const file of Object.keys(listed)) {
    if (!counts.has(file)) stale.set(file, undefined);
  }
}

/** Run every rule on `root`; returns `{ errors, summary }` and writes the baseline on `update`. */
export function runCheck(root, { update = false } = {}) {
  const baselinePath = path.join(root, "scripts", "marker-baseline.json");
  const relativeBaseline = path.relative(root, baselinePath).split(path.sep).join("/");
  const { sourceDirs, testDirs } = readScopes(root);
  const errors = [];

  const rule1 = checkSourceMarkers(root, sourceDirs);
  errors.push(...rule1.problems);

  const requirements = readRequirements(root);
  const requirementIds = new Set(requirements.keys());

  const dirs = [...sourceDirs, ...testDirs];
  const blockCounts = new Map();
  const blockDetail = new Map();
  const unnamedCounts = new Map();
  const unnamedDetail = new Map();
  const benchCounts = new Map();
  const benchDetail = new Map();
  let companions = 0;
  for (const file of trackedFiles(root, ...dirs).filter((entry) => insideDirs(entry, dirs))) {
    const text = readFileSync(path.join(root, file), "utf8");
    if (text.includes("\0")) continue;
    let allNamed = false;
    if (isCompanion(file, text)) {
      companions += 1;
      const { problems, unnamed } = checkCompanion(root, file, requirementIds);
      errors.push(...problems);
      allNamed = unnamed.length === 0;
      if (unnamed.length > 0) {
        unnamedCounts.set(file, unnamed.length);
        unnamedDetail.set(file, unnamed);
      }
    }
    const benchFailures = [];
    text.split("\n").forEach((line, index) => {
      for (const failure of checkMarkerRules(file, index + 1, line, requirements)) {
        if (failure.rule === RATCHETED_RULE) benchFailures.push(failure.message);
        else errors.push(failure.message);
      }
    });
    if (benchFailures.length > 0) {
      benchCounts.set(file, benchFailures.length);
      benchDetail.set(file, benchFailures);
    }
    if (allNamed) continue;
    const over = markerBlocks(text).filter((block) => block.ids.size > BLOCK_LIMIT);
    if (over.length > 0) {
      blockCounts.set(file, over.reduce((sum, block) => sum + block.ids.size, 0));
      blockDetail.set(file, over.map((block) => `${file}:${block.first}-${block.last}: a marker block names ${block.ids.size} requirement IDs (at most ${BLOCK_LIMIT}): put each marker at the code or test it names`));
    }
  }

  const baseline = readBaseline(baselinePath);
  const staleBlocks = new Map();
  const staleUnnamed = new Map();
  const staleBench = new Map();
  ratchet({ counts: benchCounts, detail: benchDetail, listed: baseline.strsTestsInIntegration, what: "@tests_req StRS markers under test/integration/", errors, stale: staleBench });
  ratchet({ counts: blockCounts, detail: blockDetail, listed: baseline.blocks, what: "requirement IDs in over-limit marker blocks", errors, stale: staleBlocks });
  ratchet({ counts: unnamedCounts, detail: unnamedDetail, listed: baseline.unnamedCompanionLines, what: "unnamed companion marker lines", errors, stale: staleUnnamed });

  if (update) {
    for (const [stale, listed] of [[staleBlocks, baseline.blocks], [staleUnnamed, baseline.unnamedCompanionLines], [staleBench, baseline.strsTestsInIntegration]]) {
      for (const [file, count] of stale) {
        if (count === undefined) delete listed[file];
        else listed[file] = count;
      }
    }
    writeBaseline(baselinePath, baseline);
    const lowered = staleBlocks.size + staleUnnamed.size + staleBench.size;
    console.log(`check-markers: ${relativeBaseline} updated (${lowered} entr${lowered === 1 ? "y" : "ies"} lowered or removed)`);
  } else {
    const hint = "node scripts/check-marker-companions.mjs --update";
    for (const [stale, listed] of [[staleBlocks, baseline.blocks], [staleUnnamed, baseline.unnamedCompanionLines], [staleBench, baseline.strsTestsInIntegration]]) {
      for (const [file, count] of stale) {
        errors.push(count === undefined
          ? `${file}: clean or gone; remove it from ${relativeBaseline} (${hint})`
          : `${file}: shrank to ${count} (baseline ${listed[file]}); lower ${relativeBaseline} (${hint})`);
      }
    }
  }

  const onBaseline = new Set([...Object.keys(baseline.blocks), ...Object.keys(baseline.unnamedCompanionLines), ...Object.keys(baseline.strsTestsInIntegration)]).size;
  return {
    errors,
    summary: `check-markers: ${companions} companion file(s), ${rule1.inForce} in-force SwRS marked, ${onBaseline} files on the marker baseline`,
  };
}

function main() {
  const argv = process.argv.slice(2);
  const rootIndex = argv.indexOf("--root");
  const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const root = rootIndex >= 0 ? path.resolve(argv[rootIndex + 1] ?? "") : defaultRoot;
  const { errors, summary } = runCheck(root, { update: argv.includes("--update") });
  if (errors.length > 0) {
    console.error(`check-markers: ${errors.length} problem(s)\n  ${errors.join("\n  ")}`);
    process.exit(1);
  }
  console.log(summary);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
