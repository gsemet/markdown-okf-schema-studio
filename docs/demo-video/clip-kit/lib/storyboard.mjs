// Reads clip.md (the clip's Markdown storyboard) into story.json and validates it against the take.
// The format is the contract written in docs/demo-video/guidelines/feature-clip-process.guidelines.md.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const MIN_LENGTH = 5;
export const MAX_LENGTH = 30;
export const MIN_FPS = 12;
export const MAX_FPS = 30;
export const DEFAULT_WIDTH = 1920;
export const DEFAULT_HEIGHT = 1080;
export const DEFAULT_FPS = 30;
export const MIN_RATE = 0.77;
export const MAX_RATE = 1.3;
/** How far (seconds) caption times and the clip length may be apart. */
const TOLERANCE = 0.05;

const fail = (message) => {
  throw new Error(`clip.md: ${message}`);
};

const FENCE = /^ {0,3}(`{3,}|~{3,})/u;

/**
 * The sections of the file, each with its rows `| name | value |` of every table, and the text of the
 * fenced block that follows the line starting with "Expected paste" (null when there is none).
 * A row belongs to the `## ` heading above it (heading "" before the first one). Fenced code blocks
 * are skipped: no row and no heading is read inside them. A trailing italic annotation on a field
 * name (`*(on screen)*`, `*(filmed)*`) is stripped.
 */
export function parseSections(markdown) {
  const sections = [{ heading: "", rows: [] }];
  let expectedPaste = null;
  let fence;
  let block;
  let expecting = false;
  for (const line of markdown.split(/\r?\n/u)) {
    if (fence) {
      if (line.trimStart().startsWith(fence)) {
        if (block) expectedPaste = block.join("\n");
        fence = undefined;
        block = undefined;
      } else block?.push(line);
      continue;
    }
    const opening = FENCE.exec(line);
    if (opening) {
      fence = opening[1];
      block = expecting && expectedPaste === null ? [] : undefined;
      expecting = false;
      continue;
    }
    if (line.startsWith("Expected paste")) expecting = true;
    const heading = /^## (.*?)\s*$/u.exec(line);
    if (heading) {
      sections.push({ heading: heading[1], rows: [] });
      continue;
    }
    const row = /^\| (.+?) \| (.+?) \|\s*$/u.exec(line);
    if (!row || row[1] === "Field" || /^-+$/u.test(row[1])) continue;
    const name = row[1].replace(/\s*\*\([^)]*\)\*\s*$/u, "").trim();
    sections.at(-1).rows.push([name, row[2].trim()]);
  }
  return { sections, expectedPaste };
}

const number = (text, what) => {
  const value = Number(text);
  if (!Number.isFinite(value)) fail(`${what} is not a number of seconds: "${text}"`);
  return value;
};

/** "<text>, <from> to <to> s" */
const timed = (value, what) => {
  const match = /^(.*),\s*([\d.]+) to ([\d.]+) s$/u.exec(value);
  if (!match) fail(`${what} must read "<what>, <from> to <to> s", got "${value}"`);
  return { text: match[1], from: Number(match[2]), to: Number(match[3]) };
};

/** The wrong modifier for a platform, or undefined. */
export function wrongModifier(text, platform) {
  const hasCtrl = /\bctrl\b/iu.test(text);
  const hasCmd = /⌘|\bcmd\b|\bcommand\b/iu.test(text);
  if (platform === "darwin" && hasCtrl) return "Ctrl";
  if (platform !== "darwin" && hasCmd) return "⌘ or Cmd";
  return undefined;
}

/** A badge that names both platforms: "<Ctrl form> / <⌘ form>", exactly one " / ". */
const isCombinedBadge = (text) => {
  const groups = text.split(" / ");
  return groups.length === 2 && /\bctrl\b/iu.test(groups[0]) && !/⌘/u.test(groups[0]) && /⌘/u.test(groups[1]) && !/\bctrl\b/iu.test(groups[1]);
};

const captionsOf = (sections, length) => {
  const captions = [];
  for (const { heading, rows } of sections) {
    const texts = rows.filter(([key]) => /^Text \d+$/u.test(key));
    if (texts.length === 0) continue;
    if (texts.length > 1) fail(`the section "${heading}" has more than one Text row; a section shows one caption`);
    const time = rows.find(([key]) => key === "Time")?.[1];
    const match = time === undefined ? null : /^([\d.]+) to ([\d.]+) s\b/u.exec(time);
    if (!match) fail(`the section "${heading}" has a ${texts[0][0]} row but no readable Time row ("<from> to <to> s")`);
    captions.push({ text: texts[0][1], from: Number(match[1]), to: Number(match[2]) });
  }
  if (captions.length === 0) fail("no Text row: a clip shows at least one caption");
  let expected = 0;
  for (const caption of captions) {
    if (Math.abs(caption.from - expected) > TOLERANCE) fail(`the captions must run end to end from 0 to ${length} s: "${caption.text}" starts at ${caption.from} s, expected ${expected} s`);
    expected = caption.to;
  }
  if (Math.abs(expected - length) > TOLERANCE) fail(`the captions must run end to end from 0 to ${length} s: the last ends at ${expected} s`);
  return captions;
};

const marksOf = (rows, zoom) => {
  const marks = rows
    .filter(([key]) => /^Mark \S+$/u.test(key))
    .map(([key, value]) => {
      const { text, from, to } = timed(value, key);
      if (to <= from) fail(`the mark "${key.slice(5)}" ends before it starts`);
      return { id: key.slice(5), what: text, from, to };
    });
  if (marks.length > 0 && !zoom) fail("a Mark belongs to the zoom, but the clip has no Zoom");
  const ids = marks.map((mark) => mark.id);
  if (new Set(ids).size !== ids.length) fail("two Mark rows have the same id");
  const ordered = [...marks].sort((a, b) => a.from - b.from);
  for (let i = 1; i < ordered.length; i++) {
    if (ordered[i].from < ordered[i - 1].to - 1e-9) fail(`the marks "${ordered[i - 1].id}" and "${ordered[i].id}" overlap; marks are shown in turn`);
  }
  return marks;
};

/** Parses the text of a clip.md (no take needed). */
export function parseClipText(markdown) {
  const { sections, expectedPaste } = parseSections(markdown);
  const rows = sections.flatMap((section) => section.rows);
  const field = (name) => rows.find(([key]) => key === name)?.[1];

  const lengthText = field("Length");
  if (lengthText === undefined) fail("the Length row is missing");
  const length = number(lengthText.replace(/\s*s$/u, ""), "Length");
  if (length < MIN_LENGTH || length > MAX_LENGTH) fail(`Length ${length} s is outside ${MIN_LENGTH} to ${MAX_LENGTH} s`);

  let width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT;
  const sizeText = field("Size");
  if (sizeText !== undefined) {
    const match = /^(\d+)x(\d+)\b/u.exec(sizeText);
    if (!match) fail(`Size must read "<width>x<height>", got "${sizeText}"`);
    [width, height] = [Number(match[1]), Number(match[2])];
    if (width % 2 !== 0 || height % 2 !== 0) fail(`Size ${width}x${height}: width and height must be even`);
    if (width * 9 !== height * 16) fail(`Size ${width}x${height} is not 16:9`);
  }

  let fps = DEFAULT_FPS;
  const fpsText = field("Frame rate");
  if (fpsText !== undefined) {
    const match = /^(\d+) fps\b/u.exec(fpsText);
    if (!match) fail(`Frame rate must read "<n> fps", got "${fpsText}"`);
    fps = Number(match[1]);
    if (fps < MIN_FPS || fps > MAX_FPS) fail(`Frame rate ${fps} fps is outside ${MIN_FPS} to ${MAX_FPS} fps`);
  }

  const cards = field("Cards");
  if (cards !== undefined && cards !== "none") fail(`Cards is "${cards}": the kit renders no card (use "none" or drop the row)`);

  const captions = captionsOf(sections, length);
  const badges = Object.fromEntries(rows.filter(([key]) => key.startsWith("Badge ")).map(([key, value]) => [key.slice(6), value]));

  if (rows.filter(([key]) => key === "Zoom").length > 1) fail("more than one Zoom row; a clip has one zoom");
  let zoom;
  const zoomText = field("Zoom");
  if (zoomText && zoomText !== "-") {
    const match = /^(\S+), hold to ([\d.]+) s$/u.exec(zoomText);
    if (!match) fail(`Zoom must read "<id>, hold to <seconds> s", got "${zoomText}"`);
    zoom = { id: match[1], holdTo: Number(match[2]) };
    if (zoom.holdTo >= length) fail("the zoom hold ends after the clip");
  }

  const marks = marksOf(rows, zoom);
  return { length, width, height, fps, captions, badges, zoom, marks, logo: field("Logo") ?? "top right", expectedPaste };
}

/** Parses clip.md only (no take needed). */
export function parseClip(clipFile) {
  return parseClipText(readFileSync(clipFile, "utf8"));
}

/**
 * Validates a parsed story against what the take logged (take.json) and the host (host.json).
 * Returns what story.json holds: the story, the playback rate, the filmed length and the platform.
 */
export function validateStory(story, take, host) {
  for (const [id, text] of Object.entries(story.badges)) {
    const wrong = isCombinedBadge(text) ? undefined : wrongModifier(text, host.platform);
    if (wrong) fail(`the badge "${id}" reads "${text}", which names ${wrong}, but the take was filmed on ${host.platform}`);
    if (!take.presses.some((press) => press.id === id)) fail(`the badge "${id}" has no matching press in the take`);
  }
  for (const press of take.presses) {
    if (!(press.id in story.badges)) fail(`the take pressed "${press.id}", which has no Badge row`);
  }
  if (story.zoom && !take.zooms.some((zoom) => zoom.id === story.zoom.id)) fail(`the zoom "${story.zoom.id}" was not logged by the take`);
  if (take.zooms.length > 1) throw new Error("the take logged more than one zoom");
  for (const mark of story.marks) {
    if (!take.marks.some((logged) => logged.id === mark.id)) fail(`the mark "${mark.id}" was not logged by the take`);
    if (mark.to > story.zoom.holdTo || mark.from < 0) fail(`the mark "${mark.id}" is not inside the zoom hold`);
  }
  const rate = take.filmed / story.length;
  if (rate < MIN_RATE || rate > MAX_RATE) {
    throw new Error(`the clip plays the filmed ${take.filmed.toFixed(2)} s in ${story.length} s: a playback rate of ${rate.toFixed(2)}, outside ${MIN_RATE} to ${MAX_RATE}. Change Length in clip.md or film again`);
  }
  return { ...story, rate, filmed: take.filmed, platform: host.platform };
}

/** Writes story.json (beside the clip's take) and validates it against take.json and host.json. */
export function buildStory(ctx) {
  const story = parseClip(join(ctx.clipDir, "clip.md"));
  const take = JSON.parse(readFileSync(join(ctx.take, "take.json"), "utf8"));
  const host = JSON.parse(readFileSync(ctx.takeHostFile, "utf8"));
  const out = validateStory(story, take, host);
  writeFileSync(join(ctx.render, "story.json"), JSON.stringify(out, null, 1));
  return out;
}
