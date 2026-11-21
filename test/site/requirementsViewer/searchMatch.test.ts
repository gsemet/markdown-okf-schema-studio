import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { test } from "node:test";
import * as vm from "node:vm";

import { requirement } from "./fixture";
import { parseRequirementsReport } from "./model";
import { searchIndex } from "./searchIndex";

/** The ID match of the search box, run from the shipped `viewer.js` in `node:vm` against the index of a fixture. */

const VIEWER = path.resolve(__dirname, "..", "..", "..", "..", "test", "site", "requirementsViewer", "viewer.js");
const BASE = "http://site.test/requirements/";
const strs = (area: string, number: string): string => `StRS-MDOKFSTUDIO-${area}-${number}`;
const swrs = (area: string, number: string): string => `SwRS-MDOKFSTUDIO-${area}-${number}`;

/** A requirement of the fixture, with its own title. */
function titled(id: string, tier: "StRS" | "SwRS", scope: string, title: string, options: Parameters<typeof requirement>[3] = {}): unknown {
  const made = requirement(id, tier, scope, options) as { frontmatter: { title: string } };
  made.frontmatter.title = title;
  return made;
}

/**
 * Use case and behaviour 14 of GFM, a behaviour 14 of MYST, a behaviour 140, a behaviour whose title holds 14, a
 * retired use case 2 and `extra` behaviours numbered 14 in areas of their own.
 */
function indexOf(extra: number): unknown[] {
  const parent = strs("GFM", "014");
  const own = { derivesFrom: [parent] };
  const requirements = [
    titled(parent, "StRS", "gfm", "Use case fourteen"),
    titled(strs("GFM", "002"), "StRS", "gfm", "Old use case", { lifecycle: "superseded", supersededBy: [parent] }),
    titled(swrs("GFM", "014"), "SwRS", "gfm", "Behaviour fourteen", own),
    titled(swrs("MYST", "014"), "SwRS", "myst", "Behaviour fourteen of MyST", own),
    titled(swrs("GFM", "140"), "SwRS", "gfm", "Behaviour one hundred forty", own),
    titled(swrs("GFM", "020"), "SwRS", "gfm", "Handles 14 items", own),
    titled(swrs("GFM", "114"), "SwRS", "gfm", "Behaviour one hundred fourteen", own),
  ];
  for (let n = 1; n <= extra; n += 1) requirements.push(titled(swrs(`EXTRA${n}`, "014"), "SwRS", `extra${n}`, `Extra ${n}`, own));
  const report = JSON.stringify({ generated_at: "2026-11-21T10:00:00+00:00", totals: {}, scopes: {}, requirements });
  return searchIndex(parseRequirementsReport(report, "abc123")!);
}

interface Box {
  hidden: boolean;
  value: string;
  innerHTML: string;
  checked: boolean;
  oninput?: () => void;
  onkeydown?: (event: { key: string; preventDefault(): void }) => void;
  classList: { toggle(): void };
  querySelectorAll(): unknown[];
}

interface Page {
  readonly q: Box;
  readonly history: Box;
  readonly results: Box;
  readonly location: { href: string };
}

/** Runs `viewer.js` against an index: returns the search box, the history toggle and the page location. */
function load(extra = 0): Page {
  const box = (): Box => ({ hidden: true, value: "", innerHTML: "", checked: false, classList: { toggle() {} }, querySelectorAll: () => [] });
  const boxes: Record<string, Box> = {};
  for (const id of ["history", "search", "q", "results", "search-open", "search-close"]) boxes[id] = box();
  const location = { href: "" };
  const sandbox: Record<string, unknown> = {
    document: { currentScript: { src: `${BASE}viewer.js` }, getElementById: (id: string) => boxes[id], querySelector: () => null, querySelectorAll: () => [] },
    localStorage: { setItem() {} },
    addEventListener() {},
    location,
  };
  sandbox.window = sandbox;
  sandbox.SEARCH = indexOf(extra);
  vm.runInNewContext(fs.readFileSync(VIEWER, "utf8"), sandbox);
  return { q: boxes.q!, history: boxes.history!, results: boxes.results!, location };
}

/** What a query lists: the headings (prefixed with "# ") and the IDs of the requirements, in order. */
function list(page: Page, query: string): string[] {
  page.q.value = query;
  page.q.oninput!();
  const lines = [...page.results.innerHTML.matchAll(/<h3>([^<]*)<\/h3>|<small>([^<]*)<\/small>/gu)];
  return lines.map((line) => line[1] !== undefined ? `# ${line[1]}` : (line[2] ?? "").split(" ")[0] ?? "");
}

const entries = (lines: string[]): string[] => lines.filter((line) => !line.startsWith("# "));
const FIRST = ["# Use cases", strs("GFM", "014"), "# Behaviours", swrs("GFM", "014")];

test("a full ID, a short ID and any case list the use case first and the behaviour right under it", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-092
  const page = load();
  for (const query of ["mdokfstudio-GFM-014", "GFM-014", "gfm-14", "MDOKFSTUDIO-GFM-014", "  Gfm-014  "]) {
    const lines = list(page, query);
    assert.deepEqual(lines.slice(0, 4), FIRST, query);
    assert.ok(lines.every((line) => !line.startsWith("# ") || line === "# Use cases" || line === "# Behaviours"), "no other heading");
  }
});

test("a number is not a text hit of another number: gfm-14 lists GFM-140 only after the ID matches", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-092
  const lines = list(load(), "gfm-14");
  assert.deepEqual(entries(lines), [strs("GFM", "014"), swrs("GFM", "014"), swrs("GFM", "140")]);
});

test("a full ID of one tier matches that tier only", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-092
  assert.deepEqual(list(load(), "StRS-MDOKFSTUDIO-GFM-14"), ["# Use cases", strs("GFM", "014")]);
  assert.deepEqual(list(load(), "SwRS-MDOKFSTUDIO-GFM-014"), ["# Behaviours", swrs("GFM", "014")]);
});

test("a bare number lists every requirement numbered 14 first, then the text hits", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-092
  const page = load();
  const idMatches = [strs("GFM", "014"), swrs("GFM", "014"), swrs("MYST", "014")];
  assert.deepEqual(entries(list(page, "14")), [...idMatches, swrs("GFM", "020"), swrs("GFM", "114"), swrs("GFM", "140")], "the text hits follow, in index order (114, 140 and the title that holds 14 are no ID match)");
  assert.deepEqual(entries(list(page, "014")), idMatches, "014 is the same ID match, with no text hit");
  list(page, "7");
  assert.ok(page.results.innerHTML.includes("Type a word, an ID such as SwRS-MDOKFSTUDIO-DIAG-015 or DIAG-015, or a file name."), "one digit shows the hint");
  assert.deepEqual(list(page, "07"), []);
  assert.ok(page.results.innerHTML.includes("Nothing matches"), "07 is a bare number that names no requirement");
});

test("114 is not an ID match of 14: only a 014 entry is, and 114 is found by its own number", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-092
  const page = load();
  const exact = [strs("GFM", "014"), swrs("GFM", "014"), swrs("MYST", "014")];
  for (const query of ["14", "014", "gfm-14", "GFM-014"]) {
    const lines = list(page, query);
    const at = lines.indexOf(swrs("GFM", "114"));
    const ids = entries(lines);
    assert.deepEqual(ids.slice(0, query.includes("-") ? 2 : 3), exact.slice(0, query.includes("-") ? 2 : 3), query);
    assert.ok(at < 0 || ids.indexOf(swrs("GFM", "114")) >= (query === "14" ? 3 : 2), `${query}: 114 never ranks as an ID match`);
  }
  assert.deepEqual(entries(list(page, "014")), exact, "014 lists no 114");
  assert.deepEqual(list(page, "114"), ["# Behaviours", swrs("GFM", "114")]);
  assert.deepEqual(list(page, "gfm-114"), ["# Behaviours", swrs("GFM", "114")]);
});

test("with more than 30 hits the ID matches are kept and the text hits are cut first", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-092
  const ids = entries(list(load(26), "14"));
  assert.equal(ids.length, 30);
  assert.equal(ids.filter((id) => /-014$/u.test(id)).length, 29, "the 29 ID matches are all kept");
  assert.equal(ids[29], "extra14", "the first text hit (the area whose name holds 14) fills what is left");
  assert.ok(!ids.includes(swrs("GFM", "020")) && !ids.includes(swrs("GFM", "140")), "the other text hits are cut");
  const crowded = entries(list(load(40), "14"));
  assert.equal(crowded.length, 30);
  assert.ok(crowded.every((id) => /-014$/u.test(id)), "ID matches alone fill the cap");
});

test("Enter opens the first ID match: the use case of a short ID", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-092
  const page = load();
  list(page, "gfm-14");
  page.q.onkeydown!({ key: "Enter", preventDefault() {} });
  assert.equal(page.location.href, `${BASE}gfm/${strs("GFM", "014")}/`);
});

test("a retired ID is hidden while History is off and listed once it is on", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-092
  const page = load();
  assert.deepEqual(list(page, "gfm-2"), []);
  assert.ok(page.results.innerHTML.includes("Nothing matches"));
  page.history.checked = true;
  assert.deepEqual(list(page, "gfm-2"), ["# Use cases", strs("GFM", "002")]);
  assert.ok(page.results.innerHTML.includes("retired"));
});
