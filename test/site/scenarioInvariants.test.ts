import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import test from "node:test";

import { GROUPS, isGroupId } from "../shared/e2eGroups";
import { ASSERTION_ONLY_IDS, LOCKS_BY_ID, README_BY_ID, STEPS_BY_ID } from "../visual/scenarioIds";
import { SCENARIOS } from "../visual/scenarios";

const ROOT = path.resolve(__dirname, "../../..");
const ids = new Set(SCENARIOS.map((scenario) => scenario.id));

/** The step names the screenshot campaign registers (`STEP_NAMES`), read from its source. */
function registeredSteps(): Set<string> {
  const source = fs.readFileSync(path.join(ROOT, "test/visual/capture_support.py"), "utf8");
  const match = /^STEP_NAMES = frozenset\(\{([^}]*)\}\)/mu.exec(source);
  assert.ok(match, "capture_support.py declares STEP_NAMES");
  return new Set([...match[1]!.matchAll(/"([^"]+)"/gu)].map((entry) => entry[1]!));
}

test("scenario ids are unique, follow <group>/vNN-slug, and their numbers are unique per group", () => {
  assert.equal(ids.size, SCENARIOS.length);
  const numbers = new Set<string>();
  for (const scenario of SCENARIOS) {
    assert.ok(isGroupId(scenario.group), scenario.id);
    const match = new RegExp(`^${scenario.group}/v(\\d{2,})-[a-z0-9]+(?:-[a-z0-9]+)*$`, "u").exec(scenario.id);
    assert.ok(match, `${scenario.id} does not match <group>/vNN-slug`);
    const key = `${scenario.group}/v${match[1]}`;
    assert.ok(!numbers.has(key), `duplicate number ${key}`);
    numbers.add(key);
  }
  for (const group of GROUPS) {
    const own = SCENARIOS.filter((scenario) => scenario.group === group.id);
    assert.ok(own.length > 0 || group.id === "trust-security" || group.id === "lifecycle-sync",
      `group ${group.id} has no visual scenario`);
  }
});

test("every scenario has a non-empty one-sentence locks statement and no id outside the scenarios has one", () => {
  for (const scenario of SCENARIOS) {
    const locks = scenario.locks;
    assert.ok(locks.trim().length >= 40, `${scenario.id}: locks is too short`);
    assert.ok(locks.length <= 900, `${scenario.id}: locks is not one sentence`);
    assert.ok(/[.]$/u.test(locks), `${scenario.id}: locks does not end with a full stop`);
    assert.ok(!/\.\s+[A-Z]/u.test(locks), `${scenario.id}: locks holds more than one sentence`);
  }
  assert.deepEqual(Object.keys(LOCKS_BY_ID).filter((id) => !ids.has(id)), []);
  assert.equal(Object.keys(LOCKS_BY_ID).length, SCENARIOS.length);
});

test("the TOC scenarios v22-v28 say that the fixture starts with a wide table", () => {
  const toc = SCENARIOS.filter((scenario) => /^toolbar-navigation\/v2[2-8]-/u.test(scenario.id));
  assert.equal(toc.length, 7);
  for (const scenario of toc) {
    assert.match(scenario.locks, /10-column table/u, scenario.id);
  }
});

test("assertion-only scenarios: 111 real ids, never a PNG, no kept step", () => {
  assert.equal(ASSERTION_ONLY_IDS.size, 111);
  for (const id of ASSERTION_ONLY_IDS) {
    assert.ok(ids.has(id), `${id} is not a scenario`);
  }
  const flagged = SCENARIOS.filter((scenario) => scenario.capture === false).map((scenario) => scenario.id);
  assert.deepEqual([...flagged].sort(), [...ASSERTION_ONLY_IDS].sort());
  for (const scenario of SCENARIOS.filter((entry) => entry.capture === false)) {
    assert.deepEqual(scenario.steps ?? [], [], `${scenario.id} keeps a step PNG`);
  }
});

test("every STEPS_BY_ID key is a scenario and each step name is registered in capture.py", () => {
  const registry = registeredSteps();
  assert.ok(registry.size >= 15);
  for (const [id, steps] of Object.entries(STEPS_BY_ID)) {
    assert.ok(ids.has(id), `${id} is not a scenario`);
    assert.equal(new Set(steps).size, steps.length, `${id} lists a step twice`);
    for (const step of steps) {
      assert.ok(registry.has(step), `${id}: step ${step} is not in STEP_NAMES`);
    }
  }
  for (const scenario of SCENARIOS) {
    for (const step of scenario.steps ?? []) {
      assert.ok(registry.has(step), `${scenario.id}: step ${step} is not in STEP_NAMES`);
    }
  }
});

test("README sources are scenarios that write a PNG, with a crop and a unique destination", () => {
  const sources = SCENARIOS.filter((entry) => entry.readme !== undefined);
  assert.equal(sources.length, Object.keys(README_BY_ID).length, "every README_BY_ID key is a scenario");
  assert.equal(sources.length, 18, "eighteen README images come from visual scenarios");
  const files = new Set<string>();
  for (const scenario of sources) {
    assert.notEqual(scenario.capture, false, `${scenario.id} is a README source but assertion-only`);
    assert.equal(scenario.screenshotOf, undefined, `${scenario.id} is a README source but an alias`);
    const readme = scenario.readme!;
    assert.match(readme.file, /^[a-z0-9-]+\.png$/u, scenario.id);
    assert.ok(!files.has(readme.file), `duplicate README file ${readme.file}`);
    files.add(readme.file);
    const [left, top, right, bottom] = readme.crop;
    assert.ok(right > left && bottom > top && left >= 0 && top >= 0, `${scenario.id}: crop box`);
    assert.ok(readme.width > 0, `${scenario.id}: width`);
  }
});

test("README crops that start at the top of the page keep the floating toolbar whole (right edge reaches the viewport)", () => {
  // The toolbar floats in the top-right corner: at most 400 PNG px tall (2x scale), flush with the right edge.
  const TOOLBAR_BOTTOM = 400;
  const SCALE = 2;
  for (const scenario of SCENARIOS.filter((entry) => entry.readme !== undefined)) {
    const [, top, right] = scenario.readme!.crop;
    if (top >= TOOLBAR_BOTTOM) {
      continue;
    }
    assert.ok(right >= scenario.width * SCALE,
      `${scenario.id}: README crop of ${scenario.readme!.file} ends at x=${right}, left of the viewport edge `
      + `${scenario.width * SCALE}: it cuts the floating toolbar`);
  }
});

test("generate-readme-images.py reads the visual README sources from the metadata, not from names", () => {
  const source = fs.readFileSync(path.join(ROOT, "scripts/generate-readme-images.py"), "utf8");
  assert.ok(!/VISUAL \/ "/u.test(source), "no hard-coded scenario PNG path is left in the script");
  assert.match(source, /visual_crops\(\)/u);
  assert.match(source, /--visual-only/u, "the generator can write only the headless images");
});

test("the orphan-box scenario scrolls on until the box in the bottom padding is in the frame", () => {
  const orphan = SCENARIOS.find((scenario) => scenario.orphanBoxChecks);
  assert.ok(orphan);
  assert.equal(orphan.scroll.kind, "bottom");
  assert.ok(orphan.scroll.kind === "bottom" && (orphan.scroll.extra ?? 0) >= 80);
  assert.notEqual(orphan.capture, false);
});
