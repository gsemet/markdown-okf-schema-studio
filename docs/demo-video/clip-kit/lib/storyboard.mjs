// Reads clip.md into story.json and validates it against the take.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const MIN_LENGTH = 5;
export const MAX_LENGTH = 12;
export const MIN_RATE = 0.77;
export const MAX_RATE = 1.3;

/** The rows of the `| Field | Content |` table of clip.md. */
export function parseRows(markdown) {
  const rows = [];
  for (const match of markdown.matchAll(/^\| (.+?) \| (.+?) \|\s*$/gmu)) {
    if (match[1] === "Field" || /^-+$/u.test(match[1])) continue;
    rows.push([match[1].trim(), match[2].trim()]);
  }
  return rows;
}

const seconds = (text, what) => {
  const value = Number(text);
  if (!Number.isFinite(value)) throw new Error(`clip.md: ${what} is not a number of seconds: "${text}"`);
  return value;
};

/** The wrong modifier for a platform, or undefined. */
export function wrongModifier(text, platform) {
  const hasCtrl = /\bctrl\b/iu.test(text);
  const hasCmd = /⌘|\bcmd\b|\bcommand\b/iu.test(text);
  if (platform === "darwin" && hasCtrl) return "Ctrl";
  if (platform !== "darwin" && hasCmd) return "⌘ or Cmd";
  return undefined;
}

/** Parses clip.md only (no take needed). */
export function parseClip(clipFile) {
  const rows = parseRows(readFileSync(clipFile, "utf8"));
  const field = (name) => rows.find(([key]) => key === name)?.[1];
  const length = field("Length");
  const caption = field("Caption");
  if (!caption || caption === "-") throw new Error("clip.md: the Caption row is missing or empty");
  if (length === undefined) throw new Error("clip.md: the Length row is missing");
  const lengthSeconds = seconds(length.replace(/\s*s$/u, ""), "Length");
  if (lengthSeconds < MIN_LENGTH || lengthSeconds > MAX_LENGTH) throw new Error(`clip.md: Length ${lengthSeconds} s is outside ${MIN_LENGTH} to ${MAX_LENGTH} s`);
  const badges = Object.fromEntries(rows.filter(([key]) => key.startsWith("Badge ")).map(([key, value]) => [key.slice(6), value]));
  const zoomRows = rows.filter(([key]) => key === "Zoom" && rows.find(([k]) => k === key)?.[1] !== "-");
  const zoomText = field("Zoom");
  const zoomAll = rows.filter(([key]) => key.startsWith("Zoom"));
  if (zoomAll.length > 1) throw new Error("clip.md: more than one Zoom row; a clip has one zoom");
  let zoom;
  if (zoomText && zoomText !== "-") {
    const match = /^(\S+), hold to ([\d.]+) s$/u.exec(zoomText);
    if (!match) throw new Error(`clip.md: Zoom must read "<id>, hold to <seconds> s", got "${zoomText}"`);
    zoom = { id: match[1], holdTo: Number(match[2]) };
    if (zoom.holdTo >= lengthSeconds) throw new Error("clip.md: the zoom hold ends after the clip");
  }
  void zoomRows;
  const markRows = rows.filter(([key]) => key.startsWith("Mark ") && !/^-/u.test(rows.find(([k]) => k === key)[1]));
  const markAll = rows.filter(([key]) => key.startsWith("Mark "));
  if (markAll.length > 1) throw new Error("clip.md: more than one Mark row; a clip has one mark");
  let mark;
  if (markRows.length === 1) {
    const [key, value] = markRows[0];
    const match = /^(.*?),\s*([\d.]+) to ([\d.]+) s$/u.exec(value);
    if (!match) throw new Error(`clip.md: a Mark must read "<what>, <from> to <to> s", got "${value}"`);
    mark = { id: key.slice(5), what: match[1], from: Number(match[2]), to: Number(match[3]) };
    if (mark.to <= mark.from) throw new Error("clip.md: the mark ends before it starts");
    if (!zoom) throw new Error("clip.md: a Mark belongs to the zoom, but the clip has no Zoom");
  }
  return { length: lengthSeconds, caption, badges, zoom, mark, logo: field("Logo") ?? "top right" };
}

/** Writes story.json (beside the clip's take) and validates it against take.json and host.json. */
export function buildStory(ctx) {
  const story = parseClip(join(ctx.clipDir, "clip.md"));
  const take = JSON.parse(readFileSync(join(ctx.take, "take.json"), "utf8"));
  const host = JSON.parse(readFileSync(ctx.takeHostFile, "utf8"));
  for (const [id, text] of Object.entries(story.badges)) {
    const wrong = wrongModifier(text, host.platform);
    if (wrong) throw new Error(`clip.md: the badge "${id}" reads "${text}", which names ${wrong}, but the take was filmed on ${host.platform}`);
    if (!take.presses.some((press) => press.id === id)) throw new Error(`clip.md: the badge "${id}" has no matching press in the take`);
  }
  for (const press of take.presses) {
    if (!(press.id in story.badges)) throw new Error(`clip.md: the take pressed "${press.id}", which has no Badge row`);
  }
  if (story.zoom && !take.zooms.some((zoom) => zoom.id === story.zoom.id)) throw new Error(`clip.md: the zoom "${story.zoom.id}" was not logged by the take`);
  if (take.zooms.length > 1) throw new Error("the take logged more than one zoom");
  if (story.mark) {
    if (!take.marks.some((mark) => mark.id === story.mark.id)) throw new Error(`clip.md: the mark "${story.mark.id}" was not logged by the take`);
    if (story.mark.to > story.zoom.holdTo || story.mark.from < 0) throw new Error("clip.md: the mark is not inside the zoom hold");
  }
  if (take.marks.length > 1) throw new Error("the take logged more than one mark");
  const rate = take.filmed / story.length;
  if (rate < MIN_RATE || rate > MAX_RATE) {
    throw new Error(`the clip plays the filmed ${take.filmed.toFixed(2)} s in ${story.length} s: a playback rate of ${rate.toFixed(2)}, outside ${MIN_RATE} to ${MAX_RATE}. Change Length in clip.md or film again`);
  }
  const out = { ...story, rate, filmed: take.filmed, platform: host.platform, fps: 30 };
  writeFileSync(join(ctx.render, "story.json"), JSON.stringify(out, null, 1));
  return out;
}
