// Tests of the storyboard parser: the shipped raw copy clip.md, and prepared texts for every refusal.
// Node built-ins only: no ffmpeg, no VS Code, no network.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { STAGE as STAGE_MODES } from "../../clips/block-editor-modes/scenario.mjs";
import { EXPECTED as EXPECTED_DRAG } from "../../clips/drag-list-item/scenario.mjs";
import { EXPECTED as EXPECTED_RADIO } from "../../clips/radio-buttons/scenario.mjs";
import { EXPECTED as EXPECTED_FRONTMATTER, STAGE as STAGE_FRONTMATTER } from "../../clips/okf-frontmatter/scenario.mjs";
import { EXPECTED } from "../../clips/raw-copy-balance-edges/scenario.mjs";
import { EXPECTED as EXPECTED_FIGURE } from "../../clips/figure-editor/scenario.mjs";
import { EXPECTED as EXPECTED_BUNDLE, FIXED, TYPO } from "../../clips/okf-schema-bundle-frontmatter/scenario.mjs";
import { EXPECTED as EXPECTED_KEYBOARD, STAGE as STAGE_KEYBOARD } from "../../clips/keyboard-navigation/scenario.mjs";
import { EXPECTED as EXPECTED_GRID } from "../../clips/slash-menu-grid/scenario.mjs";
import { EXPECTED as EXPECTED_TABLE } from "../../clips/table-anchors/scenario.mjs";
import { STAGE as STAGE_THEME } from "../../clips/theme-switch/scenario.mjs";
import { STAGE as STAGE_WIDE } from "../../clips/wide-table-auto-width/scenario.mjs";
import { parseClip, parseClipText, parseSections, validateStory } from "./storyboard.mjs";

/** The committed hold of the wide-table-auto-width clip's zoom, in seconds. */
const ZOOM_HOLD_WIDE = 9.6;

/** The committed length of the figure-editor clip, in seconds. */
const LENGTH_FIGURE = 12;

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
/** The marks of the shipped table-anchors clip.md: the times of its Mark rows. */
const MARKS_TABLE = [
  [7.6, 9.1],
  [9.1, 10.6],
];
/** The stage of the table-anchors clip: one padded pipe table. */
const STAGE_TABLE = [
  "# Launch checklist",
  "",
  "| Task                | Team  | Due   |",
  "| ------------------- | ----- | ----- |",
  "| Write the notes     | Docs  | Mon   |",
  "| Build the packages  | Build | Tue   |",
  "| Fix the login bug   | QA    | Today |",
  "| Publish the release | Docs  | Wed   |",
  "",
].join("\n");
/** The marks of the shipped block-editor-modes clip.md: the times of its Mark rows. */
const MARKS_MODES = [
  [5.9, 7.5],
  [7.7, 8.9],
  [9.1, 10.3],
];
/** The marks of the shipped wide-table-auto-width clip.md: the times of its Mark rows. */
const MARKS_WIDE = [
  [4.4, 6.6],
  [6.8, 9.0],
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

test("the shipped radio-buttons clip.md reads as the clip the owner reviews", () => {
  const radioFile = fileURLToPath(new URL("../../clips/radio-buttons/clip.md", import.meta.url));
  const radio = parseClip(radioFile);
  assert.equal(radio.width, 1280);
  assert.equal(radio.height, 720);
  assert.equal(radio.fps, 15);
  assert.deepEqual(
    radio.captions.map((caption) => caption.text.replaceAll("**", "")),
    ["Lists of ( ) and (x) become a radio group", "One click moves the (x) in the file"],
  );
  assert.equal(radio.captions[0].from, 0);
  assert.equal(radio.captions[0].to, radio.captions[1].from);
  assert.equal(radio.captions[1].to, radio.length);
  assert.deepEqual(radio.badges, {});
  assert.equal(radio.zoom.id, "raw");
  assert.equal(radio.zoom.holdTo, 9.5);
  assert.deepEqual(
    radio.marks.map((mark) => mark.id),
    ["1", "2"],
  );
  assert.deepEqual(radio.marks.map((mark) => [mark.from, mark.to]), [[5, 6.6], [6.6, 8.2]]);
  for (const [index, mark] of radio.marks.entries()) {
    assert.ok(mark.from >= 0 && mark.to <= radio.zoom.holdTo, `mark ${mark.id} is inside the zoom hold`);
    if (index > 0) assert.ok(mark.from >= radio.marks[index - 1].to, `mark ${mark.id} starts after the previous mark ends`);
  }
  // The "Expected result" block of clip.md is the scenario's text, character for character.
  const block = /^Expected result[^\n]*\n(?:[^\n]*\n)*?```markdown\n([\s\S]*?)\n```/mu.exec(readFileSync(radioFile, "utf8"));
  assert.ok(block, "clip.md has an Expected result block");
  assert.equal(`${block[1]}\n`, EXPECTED_RADIO);
  const take = { filmed: radio.length, presses: [], zooms: [{ id: "raw", t: 4.4 }], marks: [{ id: "1" }, { id: "2" }] };
  const out = validateStory(radio, take, win32);
  assert.equal(out.platform, "win32");
  assert.equal(out.fps, 15);
});

test("the stage of the radio-buttons clip differs from the expected text by the moved x only", () => {
  const stage = readFileSync(fileURLToPath(new URL("../../clips/radio-buttons/stage/plan.md", import.meta.url)), "utf8").split("\n");
  const expected = EXPECTED_RADIO.split("\n");
  assert.equal(stage.length, expected.length);
  const changed = stage.map((line, index) => (line === expected[index] ? 0 : index + 1)).filter(Boolean);
  assert.deepEqual(changed, [7, 8]);
  assert.equal(stage[6].replace("(x)", "( )"), expected[6]);
  assert.equal(stage[7].replace("( )", "(x)"), expected[7]);
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

test("the shipped table-anchors clip.md reads as the clip the owner reviews", () => {
  const tableFile = fileURLToPath(new URL("../../clips/table-anchors/clip.md", import.meta.url));
  const table = parseClip(tableFile);
  assert.equal(table.width, 1280);
  assert.equal(table.height, 720);
  assert.equal(table.fps, 15);
  assert.equal(table.length, 12);
  assert.deepEqual(
    table.captions.map((caption) => caption.text.replaceAll("**", "")),
    ["Drag a row or a column by its handle", "The raw table follows, each cell keeps its spacing"],
  );
  assert.equal(table.captions.length, 2);
  assert.equal(table.captions[0].from, 0);
  assert.equal(table.captions[0].to, table.captions[1].from);
  assert.equal(table.captions[1].to, table.length);
  assert.deepEqual(table.badges, {});
  assert.equal(table.zoom.id, "raw");
  assert.deepEqual(
    table.marks.map((mark) => mark.id),
    ["1", "2"],
  );
  assert.deepEqual(table.marks.map((mark) => [mark.from, mark.to]), MARKS_TABLE);
  for (const [index, mark] of table.marks.entries()) {
    assert.ok(mark.from >= 0 && mark.to <= table.zoom.holdTo, `mark ${mark.id} is inside the zoom hold`);
    if (index > 0) assert.ok(mark.from >= table.marks[index - 1].to, `mark ${mark.id} starts after the previous mark ends`);
  }
  const filmed = { filmed: table.length, presses: [], zooms: [{ id: "raw", t: 7.1 }], marks: [{ id: "1" }, { id: "2" }] };
  assert.equal(validateStory(table, filmed, win32).platform, "win32");
  // The "Expected result" block of clip.md is the scenario's text, character for character.
  const block = /^Expected result[^\n]*\n(?:[^\n]*\n)*?```markdown\n([\s\S]*?)\n```/mu.exec(readFileSync(tableFile, "utf8"));
  assert.ok(block, "clip.md has an Expected result block");
  assert.equal(`${block[1]}\n`, EXPECTED_TABLE);
});

test("the shipped table-anchors stage is the padded pipe table the clip films", () => {
  const stageFile = fileURLToPath(new URL("../../clips/table-anchors/stage/launch-checklist.md", import.meta.url));
  assert.equal(readFileSync(stageFile, "utf8"), STAGE_TABLE);
});

test("the shipped wide-table-auto-width clip.md reads as the clip the owner reviews", () => {
  const wideFile = fileURLToPath(new URL("../../clips/wide-table-auto-width/clip.md", import.meta.url));
  const wide = parseClip(wideFile);
  assert.equal(wide.width, 1280);
  assert.equal(wide.height, 720);
  assert.equal(wide.fps, 15);
  assert.deepEqual(
    wide.captions.map((caption) => caption.text.replaceAll("**", "")),
    ["In Margin, a wide table is cut at the column", "In Auto, the table breaks out; the text keeps its column"],
  );
  assert.equal(wide.captions[0].from, 0);
  assert.equal(wide.captions[0].to, wide.captions[1].from);
  assert.equal(wide.captions[1].to, wide.length);
  assert.deepEqual(wide.badges, {});
  assert.equal(wide.zoom.id, "page");
  assert.equal(wide.zoom.holdTo, ZOOM_HOLD_WIDE);
  assert.deepEqual(
    wide.marks.map((mark) => mark.id),
    ["1", "2"],
  );
  assert.deepEqual(wide.marks.map((mark) => [mark.from, mark.to]), MARKS_WIDE);
  for (const [index, mark] of wide.marks.entries()) {
    assert.ok(mark.from >= 0 && mark.to <= wide.zoom.holdTo, `mark ${mark.id} is inside the zoom hold`);
    if (index > 0) assert.ok(mark.from >= wide.marks[index - 1].to, `mark ${mark.id} starts after the previous mark ends`);
  }
  assert.equal(wide.expectedPaste, null);
  const filmed = { filmed: wide.length, presses: [], zooms: [{ id: "page", t: 3.8 }], marks: [{ id: "1" }, { id: "2" }] };
  const out = validateStory(wide, filmed, win32);
  assert.equal(out.platform, "win32");
  assert.equal(out.fps, 15);
});

test("the stage of the wide-table-auto-width scenario is the shipped stage file, byte for byte", () => {
  const stageFile = fileURLToPath(new URL("../../clips/wide-table-auto-width/stage/deploys.md", import.meta.url));
  assert.equal(STAGE_WIDE, readFileSync(stageFile, "utf8"));
});

test("the shipped figure-editor clip.md reads as the clip the owner reviews", () => {
  const figureFile = fileURLToPath(new URL("../../clips/figure-editor/clip.md", import.meta.url));
  const figure = parseClip(figureFile);
  assert.equal(figure.width, 1280);
  assert.equal(figure.height, 720);
  assert.equal(figure.fps, 15);
  assert.equal(figure.length, LENGTH_FIGURE);
  assert.ok(figure.length <= 12, "the clip is at most 12 s");
  assert.deepEqual(
    figure.captions.map((caption) => caption.text.replaceAll("**", "")),
    ["Edit figure opens one form for the whole figure", "Apply writes the options into the file"],
  );
  assert.equal(figure.captions.length, 2);
  assert.equal(figure.captions[0].from, 0);
  assert.equal(figure.captions[0].to, figure.captions[1].from);
  assert.equal(figure.captions[1].to, figure.length);
  assert.deepEqual(Object.keys(figure.badges), ["save"]);
  assert.equal(figure.zoom.id, "figure");
  assert.deepEqual(
    figure.marks.map((mark) => mark.id),
    ["1", "2"],
  );
  for (const [index, mark] of figure.marks.entries()) {
    assert.ok(mark.from >= 0 && mark.to <= figure.zoom.holdTo, `mark ${mark.id} is inside the zoom hold`);
    if (index > 0) assert.ok(mark.from >= figure.marks[index - 1].to, `mark ${mark.id} starts after the previous mark ends`);
  }
  const take = { filmed: figure.length, presses: [{ id: "save", t: 8.6 }], zooms: [{ id: "figure", t: 6.2 }], marks: [{ id: "1" }, { id: "2" }] };
  assert.equal(validateStory(figure, take, win32).platform, "win32");
  assert.equal(validateStory(figure, take, darwin).platform, "darwin");
  // The "Expected result" block of clip.md is the scenario's text, character for character.
  const block = /^Expected result[^\n]*\n(?:[^\n]*\n)*?```markdown\n([\s\S]*?)\n```/mu.exec(readFileSync(figureFile, "utf8"));
  assert.ok(block, "clip.md has an Expected result block");
  assert.equal(block[1], EXPECTED_FIGURE);
});

test("the figure-editor stage is the figure the expected result rewrites, with a 400x240 SVG", () => {
  const stage = readFileSync(fileURLToPath(new URL("../../clips/figure-editor/stage/harbour-guide.md", import.meta.url)), "utf8");
  const part = (text) => text.slice(text.indexOf(":::{figure}"), text.indexOf("\n:::\n", text.indexOf(":::{figure}")) + 5);
  assert.deepEqual(part(stage).split("\n").slice(0, 4), [":::{figure} harbour-light.svg", ":alt: A lighthouse on a rock at dusk", "", "The harbour light."]);
  assert.equal(part(stage).split("\n").filter((line) => line.startsWith(":") && !line.startsWith(":::")).length, 1, "only the :alt: option");
  const expected = part(EXPECTED_FIGURE + "\n").split("\n");
  assert.equal(expected[0], ":::{figure} harbour-light.svg");
  assert.equal(expected[1], ":alt: A lighthouse on a rock at dusk");
  // Same text around the figure: the stage with its figure part replaced is the expected result.
  assert.equal(stage.replace(part(stage), part(EXPECTED_FIGURE + "\n")), `${EXPECTED_FIGURE}\n`);
  const svg = readFileSync(fileURLToPath(new URL("../../clips/figure-editor/stage/harbour-light.svg", import.meta.url)), "utf8");
  assert.ok(svg.startsWith("<svg"));
  assert.match(svg.split("\n")[0], /width="400" height="240"/u);
});

test("the shipped okf-frontmatter clip.md reads as the clip the owner reviews", () => {
  const file = fileURLToPath(new URL("../../clips/okf-frontmatter/clip.md", import.meta.url));
  const clip = parseClip(file);
  assert.equal(clip.width, 1280);
  assert.equal(clip.height, 720);
  assert.equal(clip.fps, 15);
  assert.ok(clip.length <= 12, `Length ${clip.length} s is inside 12 s`);
  assert.deepEqual(
    clip.captions.map((caption) => caption.text.replaceAll("**", "")),
    ["Click a frontmatter value to edit it in place", "The table and the page show the new value"],
  );
  assert.equal(clip.captions[0].from, 0);
  assert.equal(clip.captions[0].to, clip.captions[1].from);
  assert.equal(clip.captions[1].to, clip.length);
  assert.deepEqual(Object.keys(clip.badges), ["save"]);
  assert.equal(clip.zoom.id, "table");
  assert.deepEqual(
    clip.marks.map((mark) => mark.id),
    ["1", "2"],
  );
  for (const [index, mark] of clip.marks.entries()) {
    assert.ok(mark.from >= 0 && mark.to <= clip.zoom.holdTo, `mark ${mark.id} is inside the zoom hold`);
    if (index > 0) assert.ok(mark.from >= clip.marks[index - 1].to, `mark ${mark.id} starts after the previous mark ends`);
  }
  const filmed = { filmed: clip.length, presses: [{ id: "save", t: 4.6 }], zooms: [{ id: "table", t: 6.2 }], marks: [{ id: "1" }, { id: "2" }] };
  assert.equal(validateStory(clip, filmed, win32).platform, "win32");
  assert.equal(validateStory(clip, filmed, darwin).platform, "darwin");
  // The "Expected result" block of clip.md is the scenario's text, character for character.
  const block = /^Expected result[^\n]*\n(?:[^\n]*\n)*?```markdown\n([\s\S]*?)\n```/mu.exec(readFileSync(file, "utf8"));
  assert.ok(block, "clip.md has an Expected result block");
  assert.equal(block[1], EXPECTED_FRONTMATTER);
});

test("the stage of the okf-frontmatter scenario is the shipped stage file, byte for byte", () => {
  const stageFile = fileURLToPath(new URL("../../clips/okf-frontmatter/stage/release-note.md", import.meta.url));
  assert.equal(STAGE_FRONTMATTER, readFileSync(stageFile, "utf8"));
});

test("the okf-frontmatter clip changes the status line only, on a page with no type and no schema folder", () => {
  const clipDir = fileURLToPath(new URL("../../clips/okf-frontmatter/", import.meta.url));
  const stage = readFileSync(`${clipDir}stage/release-note.md`, "utf8").split("\n");
  const after = `${EXPECTED_FRONTMATTER}\n`.split("\n");
  assert.equal(after.length, stage.length);
  const changed = stage.flatMap((line, index) => (line === after[index] ? [] : [[line, after[index]]]));
  assert.deepEqual(changed, [["status: draft", "status: published"]]);
  assert.ok(!stage.some((line) => line.startsWith("type:")), "the stage has no type field");
  assert.equal(existsSync(`${clipDir}stage/_schema`), false, "the clip folder has no stage/_schema folder");
});

test("the shipped block-editor-modes clip.md reads as the clip the owner reviews", () => {
  const modesFile = fileURLToPath(new URL("../../clips/block-editor-modes/clip.md", import.meta.url));
  const modes = parseClip(modesFile);
  assert.equal(modes.width, 1280);
  assert.equal(modes.height, 720);
  assert.equal(modes.fps, 15);
  assert.equal(modes.length, 12);
  assert.deepEqual(
    modes.captions.map((caption) => caption.text.replaceAll("**", "")),
    ["Click a block: its editor shows the GFM buttons", "MyST adds buttons; the page renders the same"],
  );
  assert.equal(modes.captions.length, 2);
  assert.equal(modes.captions[0].from, 0);
  assert.equal(modes.captions[0].to, modes.captions[1].from);
  assert.equal(modes.captions[1].to, modes.length);
  assert.deepEqual(modes.badges, { mode: "Ctrl+Shift+M / ⇧⌘M", down: "↓" });
  assert.equal(modes.zoom.id, "modes");
  assert.equal(modes.zoom.holdTo, 10.4);
  assert.deepEqual(
    modes.marks.map((mark) => mark.id),
    ["1", "2", "3"],
  );
  assert.deepEqual(modes.marks.map((mark) => [mark.from, mark.to]), MARKS_MODES);
  for (const [index, mark] of modes.marks.entries()) {
    assert.ok(mark.from >= 0 && mark.to <= modes.zoom.holdTo, `mark ${mark.id} is inside the zoom hold`);
    if (index > 0) assert.ok(mark.from >= modes.marks[index - 1].to, `mark ${mark.id} starts after the previous mark ends`);
  }
  assert.equal(modes.expectedPaste, null);
  const take = {
    filmed: modes.length,
    presses: [
      { id: "mode", t: 3.25 },
      { id: "down", t: 4.54 },
    ],
    zooms: [{ id: "modes", t: 5.27 }],
    marks: [{ id: "1" }, { id: "2" }, { id: "3" }],
  };
  assert.equal(validateStory(modes, take, win32).platform, "win32");
  assert.equal(validateStory(modes, take, darwin).platform, "darwin");
});

test("the stage of the block-editor-modes scenario is the shipped stage file, byte for byte", () => {
  const stageFile = fileURLToPath(new URL("../../clips/block-editor-modes/stage/release-plan.md", import.meta.url));
  assert.equal(STAGE_MODES, readFileSync(stageFile, "utf8"));
});

test("the shipped okf-schema-bundle-frontmatter clip.md reads as the clip the owner reviews", () => {
  const bundleFile = fileURLToPath(new URL("../../clips/okf-schema-bundle-frontmatter/clip.md", import.meta.url));
  const bundle = parseClip(bundleFile);
  assert.equal(bundle.width, 1280);
  assert.equal(bundle.height, 720);
  assert.equal(bundle.fps, 15);
  assert.ok(bundle.length <= 12, `the clip is at most 12 s (${bundle.length})`);
  assert.deepEqual(
    bundle.captions.map((caption) => caption.text.replaceAll("**", "")),
    ["The schema types each field: pick a valid value", "Studio validates the value: the error is gone"],
  );
  assert.equal(bundle.captions.length, 2);
  assert.equal(bundle.captions[0].from, 0);
  assert.equal(bundle.captions[0].to, bundle.captions[1].from);
  assert.equal(bundle.captions[1].to, bundle.length);
  assert.deepEqual(Object.keys(bundle.badges), ["save"]);
  assert.equal(bundle.zoom.id, "table");
  assert.deepEqual(bundle.marks.map((mark) => mark.id), ["1", "2"]);
  assert.ok(bundle.marks[0].to <= bundle.marks[1].from, "the marks come in turn");
  for (const mark of bundle.marks) assert.ok(mark.from >= 0 && mark.to <= bundle.zoom.holdTo, `mark ${mark.id} is inside the zoom hold`);
  const take = { filmed: bundle.length, presses: [{ id: "save", t: 4.8 }], zooms: [{ id: "table", t: 6.9 }], marks: [{ id: "1" }, { id: "2" }] };
  assert.equal(validateStory(bundle, take, win32).platform, "win32");
  assert.equal(validateStory(bundle, take, darwin).platform, "darwin");
  // The "Expected result" block of clip.md is the scenario's text, character for character.
  const block = /^Expected result[^\n]*\n(?:[^\n]*\n)*?```markdown\n([\s\S]*?)\n```/mu.exec(readFileSync(bundleFile, "utf8"));
  assert.ok(block, "clip.md has an Expected result block");
  assert.equal(block[1], EXPECTED_BUNDLE);
});

test("the stage of the okf-schema-bundle-frontmatter clip differs from the expected page by the status line only", () => {
  const stageFile = fileURLToPath(new URL("../../clips/okf-schema-bundle-frontmatter/stage/notes/release-note.md", import.meta.url));
  const schemaFile = fileURLToPath(new URL("../../clips/okf-schema-bundle-frontmatter/stage/_schema/note.schema.yaml", import.meta.url));
  const stage = readFileSync(stageFile, "utf8");
  assert.equal(stage.split("\n").filter((line) => line === TYPO).length, 1, "the stage holds the typo line once");
  assert.equal(stage.replace(TYPO, FIXED), `${EXPECTED_BUNDLE}\n`);
  const schema = readFileSync(schemaFile, "utf8");
  assert.match(schema, /enum:\n\s+- draft\n\s+- published\n\s+- retired\n/u);
  assert.ok(!schema.includes("publshed"), "the schema does not allow the typo");
});

test("the shipped keyboard-navigation clip.md reads as the clip the owner reviews", () => {
  const keyboard = parseClip(fileURLToPath(new URL("../../clips/keyboard-navigation/clip.md", import.meta.url)));
  assert.equal(keyboard.width, 1280);
  assert.equal(keyboard.height, 720);
  assert.equal(keyboard.fps, 15);
  assert.ok(keyboard.length > 12 && keyboard.length <= 30, `Length ${keyboard.length} s is past the old 12 s bound and inside 30 s`);
  assert.deepEqual(
    keyboard.captions.map((caption) => caption.text.replaceAll("**", "")),
    ["Press E, then the arrows pick a block", "Right goes one level deeper", "Change a word and save, no mouse at all"],
  );
  assert.equal(keyboard.captions[0].from, 0);
  assert.equal(keyboard.captions[0].to, keyboard.captions[1].from);
  assert.equal(keyboard.captions[1].to, keyboard.captions[2].from);
  assert.equal(keyboard.captions[2].to, keyboard.length);
  assert.deepEqual(keyboard.badges, {
    edit: "E",
    down: "↓",
    enter: "Enter / ↩",
    escape: "Esc",
    right: "→",
    "delete-word": "Ctrl+⌫ / ⌥⌫",
    save: "Ctrl+Enter / ⌘↩",
  });
  assert.equal(keyboard.zoom.id, "admonition");
  assert.equal(keyboard.marks.length, 1);
  assert.equal(keyboard.marks[0].id, "1");
  assert.ok(keyboard.marks[0].from >= 0 && keyboard.marks[0].to <= keyboard.zoom.holdTo, "mark 1 is inside the zoom hold");
  assert.equal(keyboard.expectedPaste, null);
  const ids = ["edit", "down", "down", "enter", "escape", "right", "down", "right", "enter", "delete-word", "save"];
  const filmed = {
    filmed: keyboard.length,
    presses: ids.map((id, index) => ({ id, t: 0.6 + index * 1.6 })),
    zooms: [{ id: "admonition", t: 8.0 }],
    marks: [{ id: "1" }],
  };
  assert.equal(validateStory(keyboard, filmed, win32).platform, "win32");
  // keyboard-nav-Q9: the badge "Ctrl+⌫ / ⌥⌫" is not a combined badge for the kit (its second group has ⌥, not ⌘), so a macOS take
  // is refused. Follow-up: accept ⌥ as well as ⌘ in isCombinedBadge, and turn this assertion into a pass.
  assert.throws(() => validateStory(keyboard, filmed, darwin), /the badge "delete-word" reads "Ctrl\+⌫ \/ ⌥⌫", which names Ctrl/u);
});

test("the stage of the keyboard-navigation scenario is the shipped stage file, and the save changes one word", () => {
  const stageFile = fileURLToPath(new URL("../../clips/keyboard-navigation/stage/release-plan.md", import.meta.url));
  assert.equal(STAGE_KEYBOARD, readFileSync(stageFile, "utf8"));
  assert.equal(STAGE_KEYBOARD.split("Friday").length - 1, 1, "Friday occurs once");
  const before = STAGE_KEYBOARD.split("\n");
  const after = EXPECTED_KEYBOARD.split("\n");
  assert.equal(after.length, before.length);
  const changed = before.flatMap((line, index) => (line === after[index] ? [] : [index + 1]));
  assert.deepEqual(changed, [6]);
  assert.equal(before[5], "- Tag the release on Friday");
  assert.equal(after[5], "- Tag the release on Thursday");
});
