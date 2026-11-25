/**
 * Pure parts of the mutation report reader (CR-450, spec 4.6): no file system, so
 * `test/build/mutationReport.test.ts` can run them on small prepared reports. The CLI is
 * `scripts/mutation-report.mjs`; the rendering is in report-render.mjs.
 *
 * A "normalized report" is `{ tests: Map<number-string, name>, mutants: [...] }`: `name` is the
 * adapter's test ID (`<file relative to out/test>::<name chain>`), and each mutant is
 * `{ file, key, status, mutator, replacement, reason, start, end, coveredBy: [name], killedBy: [name] }`
 * with 1-based lines and columns as in Stryker's JSON report.
 */

const KILLED = new Set(["Killed", "Timeout"]);
const HOLE = new Set(["Survived", "NoCoverage"]);

/** Stryker's mutation score: (killed + timeout) / (killed + timeout + survived + no coverage). */
export function scoreOf(counts) {
  const detected = (counts.Killed ?? 0) + (counts.Timeout ?? 0);
  const total = detected + (counts.Survived ?? 0) + (counts.NoCoverage ?? 0);
  return total === 0 ? undefined : (detected / total) * 100;
}

/** `src/core/<folder>/x.ts` gives `<folder>`; a file directly in `src/core` gives `(root)`. */
export function subFolderOf(file) {
  const parts = file.replace(/\\/gu, "/").split("/");
  const at = parts.indexOf("core");
  return parts.length - at > 2 ? parts[at + 1] : "(root)";
}

/** The identity of a mutant across the two phases (their numeric ids differ). */
export function mutantKey(file, mutant) {
  const { start, end } = mutant.location;
  return `${file}|${start.line}:${start.column}-${end.line}:${end.column}|${mutant.mutatorName}|${mutant.replacement}`;
}

/** A Stryker `mutation.json` as a normalized report. */
export function normalizeReport(json) {
  const tests = new Map();
  for (const entry of Object.values(json.testFiles ?? {})) for (const test of entry.tests) tests.set(test.id, test.name);
  const names = (ids) => (ids ?? []).map((id) => tests.get(id) ?? `#${id}`);
  const mutants = [];
  for (const [file, data] of Object.entries(json.files ?? {})) {
    for (const mutant of data.mutants) {
      mutants.push({
        file,
        id: mutant.id,
        key: mutantKey(file, mutant),
        status: mutant.status,
        mutator: mutant.mutatorName,
        replacement: mutant.replacement,
        reason: mutant.statusReason,
        start: mutant.location.start,
        end: mutant.location.end,
        coveredBy: names(mutant.coveredBy),
        killedBy: names(mutant.killedBy),
      });
    }
  }
  return { tests, mutants };
}

/**
 * `file:line:col-line:col` ranges (Stryker's `mutate` syntax) of the holes of a core report, without duplicates.
 * The report counts columns from 1, the `mutate` range from 0 (lines count from 1 in both).
 */
export function holeRanges(report) {
  const ranges = report.mutants
    .filter((mutant) => HOLE.has(mutant.status))
    .map((mutant) => `${mutant.file}:${mutant.start.line}:${mutant.start.column - 1}-${mutant.end.line}:${mutant.end.column - 1}`);
  return [...new Set(ranges)].sort();
}

/** Counts of statuses per sub-folder, with the holes only another layer kills. */
export function folderScores(coreMutants, otherKills) {
  const folders = new Map();
  for (const mutant of coreMutants) {
    const folder = subFolderOf(mutant.file);
    const entry = folders.get(folder) ?? { folder, counts: {}, onlyOtherLayer: 0 };
    entry.counts[mutant.status] = (entry.counts[mutant.status] ?? 0) + 1;
    if (HOLE.has(mutant.status) && otherKills.has(mutant.key)) entry.onlyOtherLayer += 1;
    folders.set(folder, entry);
  }
  return [...folders.values()]
    .map((entry) => ({ ...entry, score: scoreOf(entry.counts), scoreWithOtherLayers: scoreOf(withOther(entry)) }))
    .sort((a, b) => a.folder.localeCompare(b.folder));
}

function withOther(entry) {
  const counts = { ...entry.counts };
  counts.Killed = (counts.Killed ?? 0) + entry.onlyOtherLayer;
  const survivedFirst = Math.min(entry.onlyOtherLayer, counts.Survived ?? 0);
  counts.Survived = (counts.Survived ?? 0) - survivedFirst;
  counts.NoCoverage = (counts.NoCoverage ?? 0) - (entry.onlyOtherLayer - survivedFirst);
  return counts;
}

/**
 * Holes (survived, no coverage) with their label, from the core mutants and the others-phase kills (key -> killer names).
 * `otherTimeouts` (keys) are holes whose mutant made a test of another layer time out: not counted as a kill
 * (no test is named, and a hang can be load), so the label stays "no test kills it" with `otherTimeout` set.
 */
export function labelHoles(coreMutants, otherKills, otherTimeouts = new Set()) {
  return coreMutants
    .filter((mutant) => HOLE.has(mutant.status))
    .map((mutant) => {
      const killers = otherKills.get(mutant.key);
      return {
        file: mutant.file,
        line: mutant.start.line,
        column: mutant.start.column,
        mutator: mutant.mutator,
        replacement: mutant.replacement,
        status: mutant.status,
        label: killers ? "killed only by another layer" : "no test kills it",
        killedBy: killers ?? [],
        otherTimeout: !killers && otherTimeouts.has(mutant.key),
      };
    })
    .sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.column - b.column);
}

/** For the others report: key -> killer names, for the mutants a test of another layer killed. */
export function otherLayerKills(othersMutants, holeKeys) {
  const kills = new Map();
  for (const mutant of othersMutants) {
    if (holeKeys.has(mutant.key) && mutant.status === "Killed" && mutant.killedBy.length > 0) kills.set(mutant.key, mutant.killedBy);
  }
  return kills;
}

/** For the others report: keys of the holes that only timed out in the tests of another layer. */
export function otherLayerTimeouts(othersMutants, holeKeys) {
  return new Set(othersMutants.filter((mutant) => holeKeys.has(mutant.key) && mutant.status === "Timeout").map((mutant) => mutant.key));
}

/**
 * Sample fairness: with a sample of files, a test is judged (zero-kill, redundant) only when its test
 * file is named after a sampled source file of the same sub-folder (`core/<folder>/<base>.test.js`
 * for `src/core/<folder>/<base>.ts`). Any other test merely loads sampled modules, so what it kills
 * of the sample says nothing about it. `sampledFiles` are the mutated source files.
 *
 * The base name is the part of the test file name before its first dot, so `a.test.js`,
 * `a.requirements.test.js` and `a.holes.test.js` all belong to `a.ts`; a test file whose name does
 * not start with a source file's base name (for example `crossFile.test.js`) is never judged.
 */
export function isJudgeable(testName, sampledFiles) {
  const file = testName.split("::")[0].replace(/\\/gu, "/");
  const parts = file.split("/");
  if (parts[0] !== "core" || parts.length < 3) return false;
  const base = parts.at(-1).split(".")[0];
  const source = `src/core/${parts.slice(1, -1).join("/")}/${base}.ts`;
  return sampledFiles.has(source);
}

/** Splits entries (strings or objects with `name`) into those a sample judges fairly and the others. */
export function splitBySample(entries, sampledFiles) {
  const judged = [];
  const outside = [];
  for (const entry of entries) (isJudgeable(typeof entry === "string" ? entry : entry.name, sampledFiles) ? judged : outside).push(entry);
  return { judged, outside };
}

/**
 * Test classes from the core phase. `ranTests` is every test name of the dry run. A test is:
 * - a killer when it is in some `killedBy`;
 * - zero-kill when it reaches a Killed, Survived or Timeout mutant and kills none;
 * - not judged when it reaches mutants, none of them Killed, Survived or NoCoverage (all Ignored,
 *   Timeout or CompileError), or when it is zero-kill by load-time coverage only: every mutant it
 *   reaches is also credited to every test of its file (a mutant reached while the file loads is
 *   credited to each test of that file, mt-Q9), so its zero kills proves nothing;
 * - reaching nothing when no mutant lists it in `coveredBy`.
 */
export function classifyTests(ranTests, mutants) {
  const reached = new Map();
  const kills = new Map();
  for (const mutant of mutants) {
    for (const name of mutant.coveredBy) {
      const entry = reached.get(name) ?? { statuses: {}, count: 0 };
      entry.statuses[mutant.status] = (entry.statuses[mutant.status] ?? 0) + 1;
      entry.count += 1;
      reached.set(name, entry);
    }
    if (mutant.status === "Killed") for (const name of mutant.killedBy) kills.set(name, [...(kills.get(name) ?? []), mutant]);
  }
  const testsOfFile = new Map();
  for (const name of ranTests) {
    const file = name.split("::")[0];
    testsOfFile.set(file, [...(testsOfFile.get(file) ?? []), name]);
  }
  const reachedMutants = new Map();
  for (const mutant of mutants) for (const name of mutant.coveredBy) reachedMutants.set(name, [...(reachedMutants.get(name) ?? []), mutant]);
  const loadTimeOnly = (name) => {
    const siblings = testsOfFile.get(name.split("::")[0]) ?? [];
    return siblings.length > 1 && (reachedMutants.get(name) ?? []).every((mutant) => siblings.every((sibling) => mutant.coveredBy.includes(sibling)));
  };
  const zeroKill = [];
  const notJudged = [];
  const reachesNothing = [];
  for (const name of [...ranTests].sort()) {
    const entry = reached.get(name);
    if (!entry) {
      reachesNothing.push(name);
    } else if (kills.has(name)) {
      continue;
    } else if (["Killed", "Survived"].some((status) => entry.statuses[status]) || entry.statuses.Timeout && !onlyTimeout(entry)) {
      if (loadTimeOnly(name)) {
        notJudged.push({ name, reached: entry.statuses, reason: "load-time coverage only: every mutant it reaches is also credited to every test of its file, so zero kills proves nothing (extends mt-Q11)" });
        continue;
      }
      zeroKill.push({ name, reached: entry.statuses });
    } else {
      notJudged.push({ name, reached: entry.statuses, reason: notJudgedReason(entry) });
    }
  }
  return { zeroKill, notJudged, reachesNothing, kills };
}

const onlyTimeout = (entry) => Object.keys(entry.statuses).every((status) => status === "Timeout" || status === "Ignored" || status === "CompileError");

function notJudgedReason(entry) {
  const parts = ["Ignored", "Timeout", "CompileError"]
    .filter((status) => entry.statuses[status])
    .map((status) => `${entry.statuses[status]} ${{ Ignored: "excluded message-string", Timeout: "timeout", CompileError: "compile-error" }[status]}`);
  return `reaches only ${parts.join(", ")} mutant(s)`;
}

/**
 * Greedy redundancy (mt-Q4): a keeper set kills every Killed mutant (tests that are the only killer
 * of a mutant first, then the test killing the most uncovered mutants, ties by name); the other
 * killers are redundant. Two tests that duplicate each other are never both removable.
 */
export function redundantTests(kills) {
  const killedBy = new Map();
  for (const [name, mutants] of kills) for (const mutant of mutants) killedBy.set(mutant.key, [...(killedBy.get(mutant.key) ?? []), name]);
  const keepers = new Set();
  const uncovered = new Set(killedBy.keys());
  const keep = (name) => {
    keepers.add(name);
    for (const mutant of kills.get(name)) uncovered.delete(mutant.key);
  };
  for (const names of killedBy.values()) if (names.length === 1) keep(names[0]);
  while (uncovered.size > 0) {
    let best;
    let bestGain = -1;
    for (const [name, mutants] of [...kills].sort(([a], [b]) => a.localeCompare(b))) {
      if (keepers.has(name)) continue;
      const gain = mutants.filter((mutant) => uncovered.has(mutant.key)).length;
      if (gain > bestGain) {
        best = name;
        bestGain = gain;
      }
    }
    keep(best);
  }
  const redundant = [...kills.keys()]
    .filter((name) => !keepers.has(name))
    .sort()
    .map((name) => ({
      name,
      mutants: kills.get(name).map((mutant) => ({ file: mutant.file, line: mutant.start.line, mutator: mutant.mutator, replacement: mutant.replacement, killedAlsoBy: killedBy.get(mutant.key).filter((other) => keepers.has(other)) })),
    }));
  return { keepers: [...keepers].sort(), redundant };
}

// --- tests to SwRS -------------------------------------------------------------------------------

const MARKER = /^\s*(?:(?:#|\/\/|\/\*|\*|<!--)\s*)?@tests_req\s+([A-Za-z][A-Za-z0-9_-]*)(?:#S[1-9][0-9]*)?(?:\s+—\s+(.*))?$/u;
const OTHER_MARKER = /^\s*(?:(?:#|\/\/|\/\*|\*|<!--)\s*)?@implements_req\s/u;
const TEST_CALL = /^\s*(?:test|it)(?:\.(?:skip|todo|only))?\(\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`((?:[^`\\$]|\\.)*)`)/u;
const TEST_OPEN = /^\s*(?:test|it)(?:\.(?:skip|todo|only))?\(\s*$/u;
const NAME_ONLY = /^\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`((?:[^`\\$]|\\.)*)`)/u;

const lineKind = (line) => {
  const trimmed = line.replace(/\r$/u, "").trim();
  if (MARKER.test(trimmed) || OTHER_MARKER.test(trimmed)) return "marker";
  if (trimmed === "") return "blank";
  return /^(\/\/|#|\/\*|\*|<!--)/u.test(trimmed) || trimmed.endsWith("*/") ? "comment" : "code";
};

const unescape = (text) => text.replace(/\\(.)/gu, "$1");

/** Name of the test call at line `index`, or undefined. */
function callName(lines, index) {
  let match = TEST_CALL.exec(lines[index]);
  if (!match && TEST_OPEN.test(lines[index]) && lines[index + 1] !== undefined) match = NAME_ONLY.exec(lines[index + 1]);
  return match ? unescape(match[1] ?? match[2] ?? match[3]) : undefined;
}

/**
 * The tests of one test source and their `@tests_req` IDs: a marker counts when it sits in the
 * block above the call or inside the test body (up to the block above the next call).
 * Returns `[{ name, ids: [..], line }]`, in file order.
 */
export function testsOfSource(source) {
  const lines = source.split("\n");
  const calls = [];
  lines.forEach((line, index) => {
    const name = callName(lines, index);
    if (name !== undefined) {
      let first = index;
      while (first > 0 && ["marker", "comment", "blank"].includes(lineKind(lines[first - 1]))) first -= 1;
      calls.push({ name, line: index + 1, index, first });
    }
  });
  return calls.map((call, position) => {
    const ids = new Set();
    const end = position + 1 < calls.length ? Math.max(calls[position + 1].first, call.index + 1) : lines.length;
    for (const line of [...lines.slice(call.first, call.index), ...lines.slice(call.index + 1, end)]) {
      const match = MARKER.exec(line.replace(/\r$/u, ""));
      if (match) ids.add(match[1]);
    }
    return { name: call.name, ids: [...ids], line: call.line };
  });
}

/** The `// @tests_req <ID> — <scenario>` lines of a companion marker file: `[{ id, scenario }]`. */
export function companionLines(source) {
  return source
    .split("\n")
    .map((line) => MARKER.exec(line.replace(/\r$/u, "")))
    .filter((match) => match?.[2])
    .map((match) => ({ id: match[1], scenario: match[2].trim() }));
}

/**
 * Test name (adapter ID) to its SwRS IDs. `sources` maps a test source path relative to `test/`
 * (for example `core/find/findMatches.test.ts`) to its text; `companions` maps a companion path to
 * its text, its scenarios matching the tests of the files in its folder.
 */
export function swrsByTest(sources, companions = {}) {
  const map = new Map();
  const byFile = new Map();
  for (const [file, text] of Object.entries(sources)) {
    const tests = testsOfSource(text);
    byFile.set(file, tests);
    const seen = new Map();
    for (const test of tests) {
      const count = (seen.get(test.name) ?? 0) + 1;
      seen.set(test.name, count);
      const id = `${file.replace(/\.ts$/u, ".js")}::${test.name}${count === 1 ? "" : ` #${count}`}`;
      map.set(id, new Set(test.ids));
    }
  }
  for (const [companion, text] of Object.entries(companions)) {
    const folder = companion.slice(0, companion.lastIndexOf("/") + 1);
    for (const { id, scenario } of companionLines(text)) {
      for (const [file, tests] of byFile) {
        if (!file.startsWith(folder) || file.slice(folder.length).includes("/")) continue;
        const seen = new Map();
        for (const test of tests) {
          const count = (seen.get(test.name) ?? 0) + 1;
          seen.set(test.name, count);
          if (test.name.includes(scenario) || scenario.includes(test.name)) {
            map.get(`${file.replace(/\.ts$/u, ".js")}::${test.name}${count === 1 ? "" : ` #${count}`}`)?.add(id);
          }
        }
      }
    }
  }
  return map;
}

/** The ID in `map` for an adapter test name: a `describe > test` chain falls back to its last element. */
export function swrsOf(map, name) {
  const direct = map.get(name);
  if (direct) return direct;
  const at = name.indexOf("::");
  const chain = name.slice(at + 2).split(" > ");
  return chain.length > 1 ? map.get(`${name.slice(0, at)}::${chain.at(-1)}`) : undefined;
}

/** Score per SwRS: the mutants its tests reach and the share they kill (Timeout counts as killed). */
export function swrsScores(mutants, mapping, ranTests) {
  const testsOf = new Map();
  for (const name of ranTests) {
    for (const id of swrsOf(mapping, name) ?? []) testsOf.set(id, [...(testsOf.get(id) ?? []), name]);
  }
  const scored = [];
  for (const [id, names] of testsOf) {
    const own = new Set(names);
    let reached = 0;
    let killed = 0;
    for (const mutant of mutants) {
      if (!["Killed", "Survived", "Timeout"].includes(mutant.status)) continue;
      if (!mutant.coveredBy.some((name) => own.has(name))) continue;
      reached += 1;
      if (mutant.status === "Timeout" || mutant.killedBy.some((name) => own.has(name))) killed += 1;
    }
    scored.push({ id, tests: names.length, reached, killed, score: reached === 0 ? undefined : (killed / reached) * 100 });
  }
  return scored.sort((a, b) => a.id.localeCompare(b.id));
}

export { HOLE, KILLED };
