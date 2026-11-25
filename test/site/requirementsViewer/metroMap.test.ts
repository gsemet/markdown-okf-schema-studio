import * as assert from "node:assert/strict";
import { test } from "node:test";

import { FULL_BEHAVIOUR, FULL_USE_CASE, fullIdReport } from "./fixture";
import { buildMetroMap, metroSvg } from "./layout";
import { parseMainPaths } from "./mainPaths";
import { parseRequirementsReport, type ViewerModel } from "./model";

function load(): ViewerModel {
  const model = parseRequirementsReport(fullIdReport(), "abc123");
  assert.ok(model);
  return model;
}

const paths = (text: string) => parseMainPaths(`### Main paths\n\n${text}`);

/** Two paths that share their last two states (C and D) and the step from C to D. */
const SHARED = paths(`#### Path 1: Long way
1. A
   - SwRS-X-010: goes to B
2. B
   - SwRS-X-011: goes to C
3. C
   - SwRS-X-012: goes to D
4. D

#### Path 2: Shortcut
1. X
   - SwRS-X-013: jumps to C
2. C
   - SwRS-X-012: goes to D
3. D
`);

/** Three paths: the BLOCK-014 shape, path 3 shares nothing with the others. */
const ALONE = paths(`#### Path 1: First
1. A
   - SwRS-X-010: a
2. B
   - SwRS-X-011: b
3. C
   - SwRS-X-012: c
4. D
   - SwRS-X-016: d
5. E
   - SwRS-X-017: e
6. F
   - SwRS-X-018: f
7. G

#### Path 2: Second
1. X
   - SwRS-X-013: x
2. C
   - SwRS-X-012: c
3. D

#### Path 3: Third, alone
1. U
   - SwRS-X-014: u
2. V
   - SwRS-X-015: v
3. W
`);

const node = (map: ReturnType<typeof buildMetroMap>, key: string) => {
  const found = map.nodes.find((candidate) => candidate.key === key);
  assert.ok(found, key);
  return found;
};

test("buildMetroMap draws a state shared by two paths once, and a step of both paths once with both step indexes", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-081#S2
  const map = buildMetroMap(SHARED);
  assert.equal(map.nodes.length, 5, "A, B, C, D and X: C and D are drawn once");
  assert.deepEqual([...node(map, "C").paths], [0, 1]);
  assert.deepEqual([...node(map, "D").paths], [0, 1]);
  assert.deepEqual([...node(map, "A").paths], [0]);
  assert.deepEqual([...node(map, "X").paths], [1]);
  const shared = map.edges.filter((edge) => edge.paths.length > 1);
  assert.equal(shared.length, 1, "one edge for the step from C to D");
  assert.equal(shared[0]?.via.id, "SwRS-X-012");
  assert.deepEqual(shared[0]?.paths, [0, 1]);
  assert.equal(shared[0]?.steps.get(0), 2, "the third step of path 1");
  assert.equal(shared[0]?.steps.get(1), 1, "the second step of path 2");
  assert.equal(map.edges.length, 4, "A>B, B>C, C>D and X>C");
  // Path 1 on row 0, the state path 2 does not share on row 1; columns: one right of the state before, on every path.
  assert.equal(map.rows, 2);
  assert.deepEqual(["A", "B", "C", "D"].map((key) => [node(map, key).row, node(map, key).col]), [[0, 0], [0, 1], [0, 2], [0, 3]]);
  assert.deepEqual([node(map, "X").row, node(map, "X").col], [1, 0]);
});

test("buildMetroMap puts a path that shares nothing on the right of an earlier row, one free column after its climb", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-081#S4
  const map = buildMetroMap(ALONE);
  assert.equal(map.rows, 2, "path 3 does not get a row of its own");
  assert.deepEqual([node(map, "X").row, node(map, "X").col], [1, 0]);
  // X climbs to C (column 2): path 3 starts one free column right of that climb.
  assert.deepEqual([node(map, "U").row, node(map, "U").col], [1, 3]);
  assert.deepEqual([node(map, "V").row, node(map, "V").col], [1, 4]);
  assert.deepEqual([node(map, "W").row, node(map, "W").col], [1, 5]);
  assert.ok(map.nodes.filter((candidate) => candidate.row === 1).every((candidate) => candidate.key === "X" || candidate.col > 2));
});

const groups = (svg: string): Array<{ attributes: string; inner: string }> =>
  [...svg.matchAll(/<(?:a|g) class="tr"([^>]*)>(.*?)<\/(?:a|g)>/gsu)].map((match) => ({ attributes: match[1] ?? "", inner: match[2] ?? "" }));

test("metroSvg gives every step its paths and step indexes, one stroke per path, and a natural size", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-081#S1
  // @tests_req SwRS-MDOKFSTUDIO-CORE-081#S2
  const model = load();
  const svg = metroSvg(model, model.paths.get(FULL_USE_CASE)!, "requirements/gfm/x");
  const steps = groups(svg);
  assert.equal(steps.length, 3, "101, 102 (both paths), 104");
  for (const step of steps) {
    const listed = /data-paths="([^"]*)"/u.exec(step.attributes)?.[1]?.split(" ") ?? [];
    assert.ok(listed.length > 0);
    for (const index of listed) assert.match(step.attributes, new RegExp(`data-step-${index}="\\d+"`, "u"));
    assert.equal(step.inner.match(/class="ln"/gu)?.length, listed.length, "one stroke per path");
  }
  const shared = steps.find((step) => step.attributes.includes('data-paths="0 1"'));
  assert.ok(shared, "the step both paths take");
  assert.match(shared.attributes, /data-step-0="1"/u);
  assert.match(shared.attributes, /data-step-1="1"/u);
  assert.ok(shared.inner.includes('stroke="var(--p1)"') && shared.inner.includes('stroke="var(--p2)"'), "each stroke in the colour of its path");
  assert.ok(shared.inner.includes("(paths 1 and 2)"), "the tooltip names both paths");
  const width = /<svg class="metro" width="(\d+)" viewBox="0 0 (\d+) \d+"/u.exec(svg);
  assert.ok(width);
  assert.equal(width[1], width[2], "the width attribute is the natural width of the viewBox");
  assert.ok(!svg.includes("width:100%"));
  assert.match(svg, new RegExp(`min-width:${Math.round(Number(width[1]) * 0.85)}px`, "u"));
  // The states shared by two paths are one circle with the class join, and path 1 and 2 end in one goal.
  assert.equal(svg.match(/<g class="st[^"]*join[^"]*"/gu)?.length, 2, "Middle and Done");
  assert.equal(svg.match(/data-state="Done"/gu)?.length, 1);
});

test("metroSvg shows the full ID and the test count on two lines of every pill, and a start disc", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-081#S2
  const model = load();
  const svg = metroSvg(model, model.paths.get(FULL_USE_CASE)!, "requirements/gfm/x");
  const pill = new RegExp(`<text class="pt"[^>]*><tspan[^>]*>${FULL_BEHAVIOUR(102)}</tspan><tspan[^>]*>2 tests</tspan></text>`, "u");
  assert.match(svg, pill, "the first line is the full ID, the second the test count");
  assert.ok(!svg.includes(">GFM-102"), "no short ID");
  // A path that starts at a state of an earlier path shows its number in a disc on the lane under that state.
  const badged = metroSvg(model, paths(`#### Path 1: One
1. A
   - SwRS-X-010: a
2. B
   - SwRS-X-011: b
3. C

#### Path 2: Two
1. B
   - SwRS-X-012: c
2. D
`), "requirements/gfm/x");
  assert.equal(badged.match(/<g class="badge">/gu)?.length, 1);
  assert.match(badged, /<g class="badge"><circle[^>]*style="fill:var\(--p2\);stroke:none"\/><text[^>]*>2<\/text><\/g>/u);
  assert.ok(!svg.includes('class="badge"'), "a path that starts alone has no disc");
});

test("metroSvg draws the backtick spans of a caption in monospace, without the backticks", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-081#S3
  const model = load();
  const svg = metroSvg(model, paths(`#### Path 1: Code
1. A
   - SwRS-X-010: the writer types \`ctrl+s\` to save
2. B
`), "requirements/gfm/x");
  assert.ok(svg.includes('<tspan class="code">ctrl+s</tspan>'));
  assert.ok(!svg.includes("`"));
});

test("metroSvg draws a fourth path in the third colour", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-081#S1
  // @tests_req SwRS-MDOKFSTUDIO-CORE-081#S4
  const model = load();
  const four = paths([1, 2, 3, 4].map((index) => `#### Path ${index}: P${index}\n1. S${index}\n   - SwRS-X-01${index}: go ${index}\n2. T${index}\n`).join("\n"));
  const svg = metroSvg(model, four, "requirements/gfm/x");
  assert.equal(svg.match(/stroke="var\(--p3\)" stroke-width="7"/gu)?.length, 2, "paths 3 and 4");
  assert.ok(!svg.includes("--p4"));
});

test("metroSvg keeps a 66-character caption inside the map when the text is wider than estimated", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-081#S4
  const model = load();
  const word = "x".repeat(66);
  const svg = metroSvg(model, paths(`#### Path 1: Wide
1. A
   - SwRS-X-010: go
   - Option SwRS-X-011: ${word}
2. B
`), "requirements/gfm/x");
  const width = Number(/<svg class="metro" width="(\d+)"/u.exec(svg)?.[1]);
  const captionStart = Number(/<text class="verb"><tspan x="(\d+)"[^>]*>x{66}</u.exec(svg)?.[1]);
  assert.ok(captionStart > 0, "the caption is drawn on one line");
  // Windows measures 6.33 px per character; the box leaves 15 % for the wider text of Linux.
  assert.ok(width >= captionStart + 66 * 6.33 * 1.15, `width ${width} holds the caption from ${captionStart}`);
});
