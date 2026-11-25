// Turns the screencast frames into a 30 fps clip.mp4 and writes the timing data of the take (take.json).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

import { ffmpegBin, run } from "./platform.mjs";

export const WORK_FPS = 30;

export function prepare(ctx) {
  const meta = JSON.parse(readFileSync(join(ctx.take, "frames.json"), "utf8"));
  const events = JSON.parse(readFileSync(join(ctx.take, "events.json"), "utf8"));
  const frames = meta.frames;
  if (frames.length < 2) throw new Error("the take holds fewer than two frames");
  const t0 = frames[0].t;
  const lines = [];
  const name = (frame) => `f_${String(frame.n).padStart(6, "0")}.jpg`;
  frames.slice(0, -1).forEach((frame, i) => {
    lines.push(`file '${name(frame)}'`, `duration ${(frames[i + 1].t - frame.t).toFixed(4)}`);
  });
  const last = frames.at(-1);
  // The last file is repeated once: the concat demuxer ignores the duration of the final entry.
  lines.push(`file '${name(last)}'`, "duration 0.5", `file '${name(last)}'`);
  writeFileSync(join(ctx.take, "list.txt"), `${lines.join("\n")}\n`);
  mkdirSync(ctx.render, { recursive: true });
  run(ffmpegBin(), ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", join(ctx.take, "list.txt"), "-vf", "fps=30,scale=1920:1080:flags=lanczos", "-c:v", "libx264", "-crf", "14", "-pix_fmt", "yuv420p", join(ctx.render, "clip.mp4")]);

  const rel = (event) => Math.round((event.t - t0) * 1000) / 1000;
  const startEvent = events.find((event) => event.type === "start");
  const endEvent = events.findLast((event) => event.type === "end");
  if (!startEvent || !endEvent) throw new Error("the take has no start or end event");
  const untilOf = (i, type, id) => events.slice(i + 1).find((event) => event.type === type && event.id === id);
  const filmed = rel(endEvent);
  const data = {
    size: meta.size.slice(0, 2),
    filmed,
    mouse: events.filter((event) => event.type === "m").map((event) => ({ t: rel(event), x: event.x, y: event.y })),
    clicks: events.filter((event) => event.type === "click").map((event) => ({ t: rel(event), x: event.x, y: event.y })),
    presses: events.filter((event) => event.type === "press").map((event) => ({ id: event.id, chord: event.chord, t: rel(event) })),
    keyFrames: events.filter((event) => event.type === "keyframe").map((event) => ({ name: event.name, t: rel(event) })),
    zooms: events.flatMap((event, i) => (event.type === "zoom" ? [{ id: event.id, t: rel(event), ...event.rect }] : [])),
    marks: events.flatMap((event, i) => (event.type === "mark" ? [{ id: event.id, t: rel(event), until: rel(untilOf(i, "unmark", event.id) ?? endEvent), ...event.rect }] : [])),
  };
  const inside = frames.filter((frame) => frame.t - t0 <= filmed).length;
  const fps = inside / filmed;
  data.rawFps = Math.round(fps * 10) / 10;
  data.screencastFrames = frames.length;
  writeFileSync(join(ctx.take, "take.json"), JSON.stringify(data, null, 1));
  console.log(`filmed ${filmed.toFixed(2)} s, ${frames.length} screencast frames, ${fps.toFixed(1)} raw fps, 30 fps after retiming`);
  return { filmed, rawFps: fps, frames: frames.length };
}
