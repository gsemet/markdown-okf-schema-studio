import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import test from "node:test";

import {
  CAPTURES,
  RUN_FOLDER_PREFIX,
  SUITES,
  captureByLegacy,
  captureById,
  capturesOfSuite,
  missingCaptures,
  parseCaptureId,
  unknownCaptures,
  validateRegistry,
  type CaptureEntry,
} from "../shared/captureRegistry";
import { isGroupId } from "../shared/e2eGroups";
import { SCENARIOS } from "../visual/scenarios";

test("the real-window registry has 119 captures, 104 with a PNG and 15 assertion-only", () => {
  assert.equal(CAPTURES.length, 119);
  assert.equal(CAPTURES.filter((entry) => entry.capture !== false).length, 104);
  assert.equal(CAPTURES.filter((entry) => entry.capture === false).length, 15);
  const bySuite = Object.fromEntries(SUITES.map((suite) => [suite, capturesOfSuite(suite).length]));
  assert.deepEqual(bySuite, { "real-input": 80, checkbox: 4, frontmatter: 26, scroll: 6, reload: 3 });
});

test("the registry is valid: <group>/rNN ids, unique, gapless numbers per group, a locks sentence each", () => {
  assert.deepEqual(validateRegistry(), []);
  for (const entry of CAPTURES) {
    assert.ok(isGroupId(entry.group), entry.id);
    assert.ok(entry.locks.endsWith("."), `${entry.id}: locks is a sentence`);
  }
});

test("validateRegistry reports malformed, duplicated and gapped entries", () => {
  const base: CaptureEntry = { id: "gfm/r01-a", group: "gfm", suite: "checkbox", legacy: "a", locks: "Locks a.", clip: "window" };
  assert.deepEqual(validateRegistry([base]), []);
  assert.match(validateRegistry([{ ...base, id: "gfm/01-a" }])[0]!, /not <group>\/rNN-<slug>/u);
  assert.match(validateRegistry([base, { ...base, legacy: "b" }]).join("\n"), /duplicate id/u);
  assert.match(validateRegistry([base, { ...base, id: "gfm/r03-c", legacy: "c" }]).join("\n"), /without a gap/u);
  assert.match(validateRegistry([{ ...base, group: "myst" }]).join("\n"), /id group differs/u);
  assert.match(validateRegistry([{ ...base, locks: " " }]).join("\n"), /empty locks/u);
  assert.match(validateRegistry([{ ...base, capture: false, curated: "x.png" }]).join("\n"), /curated image must write a PNG/u);
});

test("the former frontmatter rows moved: r01-r17 to frontmatter-editing, the rest renumbered in frontmatter-schema", () => {
  assert.equal(captureById("frontmatter-editing/r17-escape-on-picker")?.legacy, "t41-escape-on-picker");
  assert.equal(captureById("frontmatter-schema/r01-description-collapsed-after-refresh-dark-narrow")?.legacy,
    "description-dark-collapsed-after-refresh-narrow");
  assert.equal(captureById("frontmatter-schema/r26-marker-navigation-destination")?.legacy, "marker-navigation-destination");
  assert.equal(captureByLegacy("real-input", "08-frontmatter-value-minimal-patch")?.id, "frontmatter-editing/r01-value-minimal-patch");
  assert.equal(captureByLegacy("scroll", "solo-bottom")?.id, "lifecycle-sync/r10-scroll-solo-bottom");
});

test("exactly the 15 byte-duplicate rows are assertion-only", () => {
  const ids = CAPTURES.filter((entry) => entry.capture === false).map((entry) => entry.id).sort();
  assert.equal(ids.length, 15);
  assert.ok(ids.includes("block-editing/r05-escape-cancels-block"));
  assert.ok(ids.includes("theme-zoom/r03-host-dark-mode-dark"));
  assert.ok(ids.includes("frontmatter-schema/r13-description-expanded-again-white-narrow"));
  assert.ok(!ids.includes("block-editing/r17-insert-after-final-figure"));
});

test("frontmatter description and link captures are clipped, README and workbench shots are not", () => {
  const preview = CAPTURES.filter((entry) => entry.clip === "preview");
  assert.equal(preview.length, 23);
  const element = CAPTURES.filter((entry) => entry.clip === "element");
  assert.deepEqual(element.map((entry) => entry.legacy).sort(), ["links-dark-saved-target", "links-white-saved-target"]);
  assert.ok([...preview, ...element].every((entry) => entry.suite === "frontmatter"));
  assert.equal(captureById("frontmatter-schema/r26-marker-navigation-destination")?.clip, "window");
  for (const entry of CAPTURES.filter((candidate) => candidate.readme !== undefined || candidate.curated !== undefined)) {
    assert.equal(entry.clip, "window", `${entry.id}: README pixel boxes are tuned to the window geometry`);
  }
});

test("the six real-window README crops and three curated images are registered with their former boxes", () => {
  const readme = CAPTURES.flatMap((entry) => (entry.readme ?? []).map((source) => ({ id: entry.id, ...source })));
  assert.deepEqual(readme.map((source) => source.file).sort(), [
    "inline-editing.png", "myst-admonitions.png", "myst-diagrams-and-figure.png",
    "open-preview-to-side.png", "open-with-editor.png", "preview-beside-editor.png",
  ]);
  const admonitions = readme.find((source) => source.file === "myst-admonitions.png");
  assert.deepEqual(admonitions?.crop, [790, 140, 1315, 445]);
  assert.equal(admonitions?.width, 720);
  assert.deepEqual(CAPTURES.filter((entry) => entry.curated !== undefined).map((entry) => entry.curated).sort(),
    ["01-paragraph-blur-commit.png", "21-edit-hover.png", "38-edit-mode-remembered.png"]);
});

test("missingCaptures expects every PNG capture of the suite and ignores assertion-only ones", () => {
  const all = capturesOfSuite("checkbox").map((entry) => entry.id);
  assert.deepEqual(missingCaptures("checkbox", all), []);
  assert.deepEqual(missingCaptures("checkbox", all.slice(1)), [all[0]]);
  const realInput = capturesOfSuite("real-input").filter((entry) => entry.capture !== false).map((entry) => entry.id);
  assert.deepEqual(missingCaptures("real-input", realInput), [], "assertion-only entries are not required");
  assert.deepEqual(unknownCaptures(["gfm/r01-task-reading-unchecked", "gfm/r99-x"]), ["gfm/r99-x"]);
});

test("parseCaptureId splits group, number and slug", () => {
  assert.deepEqual(parseCaptureId("block-editing/r12-edit-hover"), { group: "block-editing", number: 12, slug: "edit-hover" });
  assert.equal(parseCaptureId("block-editing/v12-edit-hover"), undefined);
});

test("run folder prefixes stay the ones the LATEST readers and the pruner know", () => {
  assert.deepEqual(RUN_FOLDER_PREFIX, {
    "real-input": "real-input-", checkbox: "checkbox-e2e-", frontmatter: "frontmatter-e2e-",
    scroll: "scroll-e2e-", reload: "reload-e2e-",
  });
});

test("every id passed to the writer in a suite is registered (no literal id the registry does not know)", () => {
  const root = path.resolve(__dirname, "../../../test/integration");
  const source = fs.readdirSync(root).filter((file) => file.endsWith(".ts"))
    .map((file) => fs.readFileSync(path.join(root, file), "utf8")).join("\n");
  const literals = [...source.matchAll(/"((?:[a-z0-9-]+)\/r\d{2}-[a-z0-9-]+)"/gu)].map((match) => match[1]!);
  assert.ok(literals.length > 60, `found ${literals.length} id literals`);
  assert.deepEqual(unknownCaptures(literals), []);
});

test("README file names are unique across the visual scenarios and the real-window registry", () => {
  const files = [
    ...SCENARIOS.flatMap((scenario) => scenario.readme === undefined ? [] : [scenario.readme.file]),
    ...CAPTURES.flatMap((entry) => (entry.readme ?? []).map((source) => source.file)),
  ];
  assert.equal(new Set(files).size, files.length, files.join(", "));
  assert.equal(files.length, 15, "9 visual + 6 real-window README images");
});

test("generate-readme-images.py takes the real-window sources from the registry, not from capture names", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../../../scripts/generate-readme-images.py"), "utf8");
  assert.match(source, /realCaptures/u);
  assert.match(source, /real_crops\(/u);
  assert.ok(!/real_input \/ "\d/u.test(source), "no hard-coded real-input file name is left");
});

test("curateGallery names registered real-input captures only", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../../../test/site/curateGallery.ts"), "utf8");
  const ids = [...source.matchAll(/id: "([^"]+)"/gu)].map((match) => match[1]!);
  assert.equal(ids.length, 3);
  for (const id of ids) {
    const entry = captureById(id);
    assert.equal(entry?.suite, "real-input", id);
    assert.ok(entry?.curated, `${id} is registered as curated`);
  }
});
