// Tests of the storyboard parser: the shipped raw copy clip.md, and prepared texts for every refusal.
// Node built-ins only: no ffmpeg, no VS Code, no network.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { EXPECTED as EXPECTED_DRAG } from "../../clips/drag-list-item/scenario.mjs";
import { EXPECTED } from "../../clips/raw-copy-balance-edges/scenario.mjs";
import { EXPECTED as EXPECTED_GRID } from "../../clips/slash-menu-grid/scenario.mjs";
import { STAGE as STAGE_THEME } from "../../clips/theme-switch/scenario.mjs";
import { parseClip, parseClipText, parseSections, validateStory } from "./storyboard.mjs";

const clipFile = fileURLToPath(new URL("../../clips/raw-copy-balance-edges/clip.md", import.meta.url));
const shipped = parseClip(clipFile);

/** What the take of the shipped clip logs: the presses, the zoom and the three marks. */
const take = {
  filmed: 9.85,
  presses: [
    { id: "copy", t: 2.6 },
    { id: "paste", t: 4.6 },
  ],
  zooms: [{ id: "result", t: 4.4 }],
  marks: [{ id: "1" }, { id: "2" }, { id: "3" }],
};
const SHIPPED_PASTE_LENGTH = 10.0; // the Length of clips/paste-spreadsheet-cells/clip.md, set from the take
const win32 = { platform: "win32" };
/** The marks of the shipped theme-switch clip.md: the times of its Mark rows. */
const MARKS_THEME = [
  [5.2, 7.0],
  [7.0, 8.8],
];
const darwin = { platform: "darwin" };

/** A small valid storyboard, to change one thing at a time. */
const BASE = [
  "## Clip",
  "",
  "| Field | Content |",
  "| --- | --- |",
  "| Length | 9.8 s |",
  "| Size *(on screen)* | 1280x720 16:9 |",
  "| Frame rate *(on screen)* | 15 fps |",
  "| Cards | none |",
  "",
  "## 1. Action",
  "",
  "| Field | Content |",
  "| --- | --- |",
  "| Time | 0 to 4.4 s (the action) |",
  "| Text 1 *(on screen)* | First **text** |",
  "| Badge copy | Ctrl+C / ⌘C |",
  "| Badge paste | Ctrl+V / ⌘V |",
  "",
  "## 2. Result",
  "",
  "| Field | Content |",
  "| --- | --- |",
  "| Time | 4.4 to 9.8 s |",
  "| Zoom | result, hold to 8.8 s |",
  "| Mark 1 | the first part, 5.0 to 6.2 s |",
  "| Mark 2 | the second part, 6.2 to 7.4 s |",
  "| Text 2 *(on screen)* | Second text |",
  "",
].join("\n");

/** BASE with one line replaced; fails when the line is not in BASE, so a test cannot silently test nothing. */
const variant = (from, to) => {
  assert.ok(BASE.includes(from), `BASE has no "${from}"`);
  return BASE.replace(from, to);
};

const refused = (text, pattern) => assert.throws(() => parseClipText(text), { message: pattern });

test("the shipped clip.md reads as the approved storyboard", () => {
  assert.equal(shipped.length, 9.8);
  assert.equal(shipped.width, 1280);
  assert.equal(shipped.height, 720);
  assert.equal(shipped.fps, 15);
  assert.deepEqual(
    shipped.captions.map((caption) => caption.text),
    ["From the preview, select and copy **raw Markdown**", "Cut-off syntax is **completed** on copy to ensure valid Markdown"],
  );
  assert.equal(shipped.captions[0].from, 0);
  assert.equal(shipped.captions[0].to, shipped.captions[1].from);
  assert.equal(shipped.captions[1].to, shipped.length);
  assert.deepEqual(shipped.badges, { copy: "Ctrl+C / ⌘C", paste: "Ctrl+V / ⌘V" });
  assert.equal(shipped.zoom.id, "result");
  assert.deepEqual(
    shipped.marks.map((mark) => mark.id),
    ["1", "2", "3"],
  );
  for (const [index, mark] of shipped.marks.entries()) {
    assert.ok(mark.from >= 0 && mark.to <= shipped.zoom.holdTo, `mark ${mark.id} is inside the zoom hold`);
    if (index > 0) assert.ok(mark.from >= shipped.marks[index - 1].to, `mark ${mark.id} starts after the previous mark ends`);
  }
});

test("the rows of the fenced Expected paste block are not fields", () => {
  const { sections } = parseSections(readFileSync(clipFile, "utf8"));
  const zoomSection = sections.find((section) => section.heading === "2. Zoom on the pasted text");
  assert.ok(zoomSection, "section 2 exists");
  const names = zoomSection.rows.map(([name]) => name);
  assert.ok(!names.includes("Step"), "no field Step");
  assert.ok(!names.includes("Migrate"), "no field Migrate");
  assert.ok(names.includes("Zoom") && names.includes("Mark 3") && names.includes("Text 2"));
});

test("EXPECTED in scenario.mjs is the Expected paste block of clip.md, character for character", () => {
  assert.equal(typeof shipped.expectedPaste, "string");
  assert.equal(EXPECTED, shipped.expectedPaste);
});

test("the shipped story validates against its take on Windows and on macOS (combined badges)", () => {
  for (const host of [win32, darwin]) {
    const out = validateStory(shipped, take, host);
    assert.equal(out.platform, host.platform);
    assert.equal(out.fps, 15);
    assert.ok(out.rate > 0.77 && out.rate < 1.3);
  }
});

test("a badge that names only the other platform's modifier is refused", () => {
  assert.throws(() => validateStory({ ...shipped, badges: { ...shipped.badges, copy: "⌘C" } }, take, win32), { message: /^clip\.md: the badge "copy" reads "⌘C"/u });
  assert.throws(() => validateStory({ ...shipped, badges: { ...shipped.badges, copy: "Ctrl+C" } }, take, darwin), { message: /^clip\.md: the badge "copy" reads "Ctrl\+C"/u });
});

test("a mark the take did not log, and a mark outside the hold, are refused", () => {
  assert.throws(() => validateStory(shipped, { ...take, marks: take.marks.slice(0, 2) }, win32), { message: /^clip\.md: the mark "3" was not logged/u });
  const outside = parseClipText(variant("| Mark 2 | the second part, 6.2 to 7.4 s |", "| Mark 2 | the second part, 6.2 to 9.0 s |"));
  assert.throws(() => validateStory(outside, { ...take, marks: take.marks.slice(0, 2) }, win32), { message: /^clip\.md: the mark "2" is not inside the zoom hold/u });
});

test("a badge with no press and a press with no badge are refused", () => {
  assert.throws(() => validateStory(shipped, { ...take, presses: take.presses.slice(0, 1) }, win32), { message: /^clip\.md: the badge "paste" has no matching press/u });
  assert.throws(() => validateStory({ ...shipped, badges: { copy: shipped.badges.copy } }, take, win32), { message: /^clip\.md: the take pressed "paste"/u });
});

test("prepared refusals: size, frame rate, cards", () => {
  refused(variant("1280x720 16:9", "1280x600"), /^clip\.md: Size 1280x600 is not 16:9/u);
  refused(variant("1280x720 16:9", "1281x721"), /^clip\.md: Size 1281x721: width and height must be even/u);
  refused(variant("| 15 fps |", "| 60 fps |"), /^clip\.md: Frame rate 60 fps is outside 12 to 30 fps/u);
  refused(variant("| Cards | none |", "| Cards | opening |"), /^clip\.md: Cards is "opening": the kit renders no card/u);
});

test("prepared refusals: a length outside 5 to 30 s; 30.0 s is accepted", () => {
  refused(variant("| Length | 9.8 s |", "| Length | 4.9 s |"), /^clip\.md: Length .* s is outside 5 to 30 s/u);
  refused(variant("| Length | 9.8 s |", "| Length | 30.1 s |"), /^clip\.md: Length .* s is outside 5 to 30 s/u);
  const longest = parseClipText(variant("| Length | 9.8 s |", "| Length | 30.0 s |").replace("| Time | 4.4 to 9.8 s |", "| Time | 4.4 to 30.0 s |"));
  assert.equal(longest.length, 30);
  assert.equal(longest.captions[1].to, 30);
});

test("prepared refusals: captions", () => {
  refused(variant("| Text 2 *(on screen)* | Second text |", "| Text 3 *(on screen)* | Another |\n| Text 2 *(on screen)* | Second text |"), /^clip\.md: the section "2\. Result" has more than one Text row/u);
  refused(variant("| Time | 4.4 to 9.8 s |", "| Time | 4.9 to 9.8 s |"), /^clip\.md: the captions must run end to end/u);
  refused(variant("| Time | 4.4 to 9.8 s |", "| Time | 4.4 to 9.0 s |"), /^clip\.md: the captions must run end to end/u);
  refused(variant("| Time | 0 to 4.4 s (the action) |", "| Time | the beginning |"), /^clip\.md: the section "1\. Action" has a Text 1 row but no readable Time row/u);
  refused(variant("| Time | 0 to 4.4 s (the action) |\n", ""), /^clip\.md: the section "1\. Action" has a Text 1 row but no readable Time row/u);
  const noText = BASE.split("\n").filter((line) => !line.startsWith("| Text ")).join("\n");
  refused(noText, /^clip\.md: no Text row/u);
  refused(variant("| Text 1 *(on screen)* | First **text** |", "| Caption | First **text** |").replace("| Text 2 *(on screen)* | Second text |", ""), /^clip\.md: no Text row/u);
});

test("prepared refusals: marks", () => {
  refused(variant("| Mark 2 | the second part, 6.2 to 7.4 s |", "| Mark 2 | the second part, 5.5 to 7.4 s |"), /^clip\.md: the marks "1" and "2" overlap/u);
  refused(variant("| Mark 2 | the second part, 6.2 to 7.4 s |", "| Mark 2 | the second part, 7.4 to 6.2 s |"), /^clip\.md: the mark "2" ends before it starts/u);
  refused(variant("| Mark 2 | the second part, 6.2 to 7.4 s |", "| Mark 2 | - |"), /^clip\.md: Mark 2 must read "<what>, <from> to <to> s", got "-"/u);
  refused(variant("| Zoom | result, hold to 8.8 s |\n", ""), /^clip\.md: a Mark belongs to the zoom, but the clip has no Zoom/u);
});

test("a clip with no mark has no Mark row", () => {
  const none = BASE.split("\n").filter((line) => !line.startsWith("| Mark ")).join("\n");
  assert.deepEqual(parseClipText(none).marks, []);
});

test("a table inside a fenced block gives no field", () => {
  const fenced = [BASE, "Expected paste:", "", "```markdown", "| Field | Content |", "| --- | --- |", "| Size | 640x480 |", "| Frame rate | 60 fps |", "| Cards | opening |", "## 3. Not a section", "```", ""].join("\n");
  const { sections, expectedPaste } = parseSections(fenced);
  assert.deepEqual(
    sections.map((section) => section.heading),
    ["", "Clip", "1. Action", "2. Result"],
  );
  const names = sections.flatMap((section) => section.rows.map(([name]) => name));
  assert.equal(names.filter((name) => name === "Size").length, 1);
  assert.equal(names.filter((name) => name === "Frame rate").length, 1);
  assert.equal(expectedPaste, "| Field | Content |\n| --- | --- |\n| Size | 640x480 |\n| Frame rate | 60 fps |\n| Cards | opening |\n## 3. Not a section");
  const story = parseClipText(fenced);
  assert.equal(story.width, 1280);
  assert.equal(story.fps, 15);
});

test("a storyboard with no Size and no Frame rate is 1920x1080 at 30 fps", () => {
  const plain = BASE.split("\n").filter((line) => !line.startsWith("| Size") && !line.startsWith("| Frame rate")).join("\n");
  const story = parseClipText(plain);
  assert.equal(story.width, 1920);
  assert.equal(story.height, 1080);
  assert.equal(story.fps, 30);
});

test("the shipped drag-list-item clip.md reads as the clip the owner reviews", () => {
  const dragFile = fileURLToPath(new URL("../../clips/drag-list-item/clip.md", import.meta.url));
  const drag = parseClip(dragFile);
  assert.equal(drag.width, 1280);
  assert.equal(drag.height, 720);
  assert.equal(drag.fps, 15);
  assert.deepEqual(
    drag.captions.map((caption) => caption.text.replaceAll("**", "")),
    ["Drag a list item by its handle, sub-items come along", "The raw text follows, numbers kept in order"],
  );
  assert.equal(drag.captions[0].from, 0);
  assert.equal(drag.captions[0].to, drag.captions[1].from);
  assert.equal(drag.captions[1].to, drag.length);
  assert.deepEqual(drag.badges, {});
  assert.equal(drag.zoom.id, "raw");
  assert.equal(drag.zoom.holdTo, 9.5);
  assert.deepEqual(
    drag.marks.map((mark) => mark.id),
    ["1", "2"],
  );
  assert.deepEqual(drag.marks.map((mark) => [mark.from, mark.to]), [[5, 6.6], [6.6, 8.2]]);
  for (const [index, mark] of drag.marks.entries()) {
    assert.ok(mark.from >= 0 && mark.to <= drag.zoom.holdTo, `mark ${mark.id} is inside the zoom hold`);
    if (index > 0) assert.ok(mark.from >= drag.marks[index - 1].to, `mark ${mark.id} starts after the previous mark ends`);
  }
  // The "Expected result" block of clip.md is the scenario's text, character for character.
  const block = /^Expected result[^\n]*\n(?:[^\n]*\n)*?```markdown\n([\s\S]*?)\n```/mu.exec(readFileSync(dragFile, "utf8"));
  assert.ok(block, "clip.md has an Expected result block");
  assert.equal(`${block[1]}\n`, EXPECTED_DRAG);
  const take = { filmed: drag.length, presses: [], zooms: [{ id: "raw", t: 4.4 }], marks: [{ id: "1" }, { id: "2" }] };
  const out = validateStory(drag, take, win32);
  assert.equal(out.platform, "win32");
  assert.equal(out.fps, 15);
});

test("the shipped export-html clip.md reads as the clip the owner reviews", () => {
  const exportFile = fileURLToPath(new URL("../../clips/export-html/clip.md", import.meta.url));
  const clip = parseClip(exportFile);
  assert.equal(clip.width, 1280);
  assert.equal(clip.height, 720);
  assert.equal(clip.fps, 15);
  assert.equal(clip.length, 12);
  assert.deepEqual(
    clip.captions.map((caption) => caption.text.replaceAll("**", "")),
    ["Export the page to one HTML file", "Any browser shows the same themed page"],
  );
  assert.equal(clip.captions[0].from, 0);
  assert.equal(clip.captions[0].to, clip.captions[1].from);
  assert.equal(clip.captions[1].to, clip.length);
  assert.deepEqual(Object.keys(clip.badges), ["palette"]);
  assert.equal(clip.badges.palette, "Ctrl+Shift+P / ⇧⌘P");
  assert.equal(clip.expectedPaste, null);
  assert.equal(clip.zoom.id, "page");
  assert.equal(clip.zoom.holdTo, 11);
  assert.deepEqual(clip.marks.map((mark) => [mark.id, mark.from, mark.to]), [["1", 6.6, 8], ["2", 8.6, 10.2]]);
  for (const [index, mark] of clip.marks.entries()) {
    assert.ok(mark.from >= 0 && mark.to <= clip.zoom.holdTo, `mark ${mark.id} is inside the zoom hold`);
    if (index > 0) assert.ok(mark.from >= clip.marks[index - 1].to, `mark ${mark.id} starts after the previous mark ends`);
  }
  const filmed = { filmed: clip.length, presses: [{ id: "palette", t: 2.8 }], zooms: [{ id: "page", t: 6 }], marks: [{ id: "1" }, { id: "2" }] };
  for (const host of [win32, darwin]) {
    const out = validateStory(clip, filmed, host);
    assert.equal(out.platform, host.platform);
    assert.equal(out.fps, 15);
  }
});

test("the shipped paste-spreadsheet-cells clip.md reads as the clip the owner reviews", async () => {
  const pasteFile = fileURLToPath(new URL("../../clips/paste-spreadsheet-cells/clip.md", import.meta.url));
  const paste = parseClip(pasteFile);
  assert.equal(paste.length, SHIPPED_PASTE_LENGTH);
  assert.equal(paste.width, 1280);
  assert.equal(paste.height, 720);
  assert.equal(paste.fps, 15);
  assert.deepEqual(
    paste.captions.map((caption) => caption.text),
    ["Copy cells from a sheet, **paste** into a table", "Cells fill right and down, **rows and columns** added"],
  );
  assert.equal(paste.captions[0].from, 0);
  assert.equal(paste.captions[0].to, paste.captions[1].from);
  assert.equal(paste.captions[1].to, paste.length);
  assert.deepEqual(paste.badges, { copy: "Ctrl+C / ⌘C", paste: "Ctrl+V / ⌘V" });
  assert.equal(paste.zoom.id, "table");
  assert.deepEqual(
    paste.marks.map((mark) => mark.id),
    ["1", "2"],
  );
  for (const [index, mark] of paste.marks.entries()) {
    assert.ok(mark.from >= 0 && mark.to <= paste.zoom.holdTo, `mark ${mark.id} is inside the zoom hold`);
    if (index > 0) assert.ok(mark.from >= paste.marks[index - 1].to, `mark ${mark.id} starts after the previous mark ends`);
  }
  // The "Expected paste" block of clip.md is the scenario's text, character for character (the scenario ends with one newline).
  const scenario = await import(pathToFileURL(fileURLToPath(new URL("../../clips/paste-spreadsheet-cells/scenario.mjs", import.meta.url))).href);
  assert.equal(typeof paste.expectedPaste, "string");
  assert.equal(`${paste.expectedPaste}\n`, scenario.EXPECTED);
  const take = { filmed: paste.length, presses: [{ id: "copy", t: 2 }, { id: "paste", t: 3.8 }], zooms: [{ id: "table", t: 5 }], marks: [{ id: "1" }, { id: "2" }] };
  for (const host of [win32, darwin]) {
    const out = validateStory(paste, take, host);
    assert.equal(out.platform, host.platform);
    assert.equal(out.fps, 15);
  }
});

test("the shipped diff-side-by-side clip.md reads as the clip the owner reviews", () => {
  const diff = parseClip(fileURLToPath(new URL("../../clips/diff-side-by-side/clip.md", import.meta.url)));
  assert.equal(diff.width, 1280);
  assert.equal(diff.height, 720);
  assert.equal(diff.fps, 15);
  assert.deepEqual(
    diff.captions.map((caption) => caption.text.replaceAll("**", "")),
    ["Diff marks every block changed since the last commit", "Side-by-side shows before and after, word by word"],
  );
  assert.equal(diff.captions[0].from, 0);
  assert.equal(diff.captions[0].to, diff.captions[1].from);
  assert.equal(diff.captions[1].to, diff.length);
  assert.deepEqual(diff.badges, {});
  assert.equal(diff.zoom.id, "card");
  assert.deepEqual(
    diff.marks.map((mark) => mark.id),
    ["1", "2", "3", "4"],
  );
  for (const [index, mark] of diff.marks.entries()) {
    assert.ok(mark.from >= 0 && mark.to <= diff.zoom.holdTo, `mark ${mark.id} is inside the zoom hold`);
    if (index > 0) assert.ok(mark.from >= diff.marks[index - 1].to, `mark ${mark.id} starts after the previous mark ends`);
  }
  assert.equal(diff.expectedPaste, null);
  const diffTake = { filmed: diff.length, presses: [], zooms: [{ id: "card", t: 4.6 }], marks: [{ id: "1" }, { id: "2" }, { id: "3" }, { id: "4" }] };
  const out = validateStory(diff, diffTake, win32);
  assert.equal(out.platform, "win32");
  assert.equal(out.fps, 15);
});

test("the shipped theme-switch clip.md reads as the clip the owner reviews", () => {
  const themeFile = fileURLToPath(new URL("../../clips/theme-switch/clip.md", import.meta.url));
  const theme = parseClip(themeFile);
  assert.equal(theme.width, 1280);
  assert.equal(theme.height, 720);
  assert.equal(theme.fps, 15);
  assert.deepEqual(
    theme.captions.map((caption) => caption.text.replaceAll("**", "")),
    ["One click turns the whole page to another theme", "Diagrams and charts follow the theme"],
  );
  assert.equal(theme.captions[0].from, 0);
  assert.equal(theme.captions[0].to, theme.captions[1].from);
  assert.equal(theme.captions[1].to, theme.length);
  assert.deepEqual(theme.badges, {});
  assert.equal(theme.zoom.id, "charts");
  assert.deepEqual(
    theme.marks.map((mark) => mark.id),
    ["1", "2"],
  );
  assert.deepEqual(theme.marks.map((mark) => [mark.from, mark.to]), MARKS_THEME);
  for (const [index, mark] of theme.marks.entries()) {
    assert.ok(mark.from >= 0 && mark.to <= theme.zoom.holdTo, `mark ${mark.id} is inside the zoom hold`);
    if (index > 0) assert.ok(mark.from >= theme.marks[index - 1].to, `mark ${mark.id} starts after the previous mark ends`);
  }
  const filmed = { filmed: theme.length, presses: [], zooms: [{ id: "charts", t: 4.2 }], marks: [{ id: "1" }, { id: "2" }] };
  const out = validateStory(theme, filmed, win32);
  assert.equal(out.platform, "win32");
  assert.equal(out.fps, 15);
});

test("the shipped slash-menu-grid clip.md reads as the clip the owner reviews", () => {
  const gridFile = fileURLToPath(new URL("../../clips/slash-menu-grid/clip.md", import.meta.url));
  const grid = parseClip(gridFile);
  assert.equal(grid.width, 1280);
  assert.equal(grid.height, 720);
  assert.equal(grid.fps, 15);
  assert.equal(grid.length, 11.5);
  assert.deepEqual(
    grid.captions.map((caption) => caption.text.replaceAll("**", "")),
    ["Type /grid in a block to insert a card grid", "A MyST card grid, rendered in place"],
  );
  assert.equal(grid.captions.length, 2);
  assert.equal(grid.captions[0].from, 0);
  assert.equal(grid.captions[0].to, grid.captions[1].from);
  assert.equal(grid.captions[1].to, grid.length);
  assert.deepEqual(Object.keys(grid.badges), ["save"]);
  assert.equal(grid.zoom.id, "grid");
  assert.equal(grid.marks.length, 1);
  assert.equal(grid.marks[0].id, "1");
  assert.ok(grid.marks[0].from >= 0 && grid.marks[0].to <= grid.zoom.holdTo, "mark 1 is inside the zoom hold");
  const take = { filmed: grid.length, presses: [{ id: "save", t: 5.8 }], zooms: [{ id: "grid", t: 6.5 }], marks: [{ id: "1" }] };
  assert.equal(validateStory(grid, take, win32).platform, "win32");
  assert.equal(validateStory(grid, take, darwin).platform, "darwin");
  // The "Expected result" block of clip.md is the scenario's text, character for character.
  const block = /^Expected result[^\n]*\n(?:[^\n]*\n)*?```markdown\n([\s\S]*?)\n```/mu.exec(readFileSync(gridFile, "utf8"));
  assert.ok(block, "clip.md has an Expected result block");
  assert.equal(block[1], EXPECTED_GRID);
});

test("the shipped advanced-renderings-tour clip.md reads as the clip the owner reviews", () => {
  const tour = parseClip(fileURLToPath(new URL("../../clips/advanced-renderings-tour/clip.md", import.meta.url)));
  assert.equal(tour.width, 1280);
  assert.equal(tour.height, 720);
  assert.equal(tour.fps, 15);
  assert.ok(tour.length > 12 && tour.length <= 30, `Length ${tour.length} s is past the old 12 s bound and inside 30 s`);
  assert.deepEqual(
    tour.captions.map((caption) => caption.text.replaceAll("**", "")),
    [
      "Mermaid diagrams, drawn in the page",
      "PlantUML built in, with no Java",
      "Vega-Lite charts from a few lines",
      "Full Vega specs for custom charts",
      "Math typeset by KaTeX",
      "SVG drawn in the page colours",
    ],
  );
  assert.equal(tour.captions[0].from, 0);
  for (let index = 1; index < tour.captions.length; index++) assert.equal(tour.captions[index].from, tour.captions[index - 1].to, `caption ${index + 1} starts where caption ${index} ends`);
  assert.equal(tour.captions.at(-1).to, tour.length);
  assert.deepEqual(tour.badges, {});
  assert.equal(tour.zoom.id, "tour");
  assert.deepEqual(
    tour.marks.map((mark) => mark.id),
    ["1", "2", "3", "4", "5", "6"],
  );
  for (const [index, mark] of tour.marks.entries()) {
    assert.ok(mark.from >= 0 && mark.to <= tour.zoom.holdTo, `mark ${mark.id} is inside the zoom hold`);
    if (index > 0) assert.ok(mark.from >= tour.marks[index - 1].to, `mark ${mark.id} starts after the previous mark ends`);
  }
  assert.equal(tour.expectedPaste, null);
  const filmed = { filmed: tour.length, presses: [], zooms: [{ id: "tour", t: 0.4 }], marks: [1, 2, 3, 4, 5, 6].map((id) => ({ id: String(id) })) };
  for (const host of [win32, darwin]) {
    const out = validateStory(tour, filmed, host);
    assert.equal(out.platform, host.platform);
    assert.equal(out.fps, 15);
  }
});

test("the stage of the theme-switch scenario is the shipped stage file, byte for byte", () => {
  const stageFile = fileURLToPath(new URL("../../clips/theme-switch/stage/handbook.md", import.meta.url));
  assert.equal(STAGE_THEME, readFileSync(stageFile, "utf8"));
});
