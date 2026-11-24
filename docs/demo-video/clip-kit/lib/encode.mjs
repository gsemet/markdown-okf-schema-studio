// The Remotion install and render, then the encodes and the evidence pictures from the master.
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { REPO_ROOT, ffmpegBin, filterPath, fontFile, run } from "./platform.mjs";

const REMOTION_VERSION = "4.0.539";
const CLI = ["node_modules", "@remotion", "cli", "remotion-cli.js"];
const MB = 1024 * 1024;

export const BUDGETS = { mp4: 10 * MB, webm: 3 * MB, gif: 3 * MB };
export const MP4_LADDER = [undefined, 20, 22];
export const GIF_LADDER = [
  { fps: 12, width: 960, colors: 128 },
  { fps: 10, width: 960, colors: 128 },
  { fps: 10, width: 800, colors: 128 },
  { fps: 10, width: 800, colors: 96 },
];

export const remotionReady = (ctx) => existsSync(join(ctx.remotion, ...CLI));

/** Installs Remotion into <scratch>/remotion when it is absent (never into the repository). */
export function installRemotion(ctx) {
  if (remotionReady(ctx)) return;
  mkdirSync(ctx.remotion, { recursive: true });
  writeFileSync(join(ctx.remotion, "package.json"), JSON.stringify({ name: "clip-kit-scratch", private: true, type: "module" }, null, 2));
  run("npm", ["install", `remotion@${REMOTION_VERSION}`, `@remotion/cli@${REMOTION_VERSION}`, "react@19", "react-dom@19", "--no-audit", "--no-fund"], { shell: true, cwd: ctx.remotion });
}

/** Copies the composition and the clip's data into the scratch Remotion folder and renders the master. */
export function renderMaster(ctx) {
  if (!remotionReady(ctx)) throw new Error("Remotion is not installed; run the `setup` step first");
  const source = join(REPO_ROOT, "docs", "demo-video", "clip-kit", "remotion");
  mkdirSync(join(ctx.remotion, "public"), { recursive: true });
  rmSync(join(ctx.remotion, "src"), { recursive: true, force: true });
  cpSync(join(source, "src"), join(ctx.remotion, "src"), { recursive: true });
  for (const file of ["remotion.config.ts", "tsconfig.json"]) copyFileSync(join(source, file), join(ctx.remotion, file));
  copyFileSync(join(ctx.render, "clip.mp4"), join(ctx.remotion, "public", "clip.mp4"));
  copyFileSync(join(REPO_ROOT, "images", "logo.png"), join(ctx.remotion, "public", "logo.png"));
  copyFileSync(join(ctx.render, "story.json"), join(ctx.remotion, "src", "story.json"));
  copyFileSync(join(ctx.take, "take.json"), join(ctx.remotion, "src", "take.json"));
  mkdirSync(join(ctx.remotion, "out"), { recursive: true });
  rmSync(join(ctx.remotion, "out", "master.mp4"), { force: true });
  run(process.execPath, [join(ctx.remotion, ...CLI), "render", "src/index.ts", "Clip", "out/master.mp4", "--codec=h264", "--pixel-format=yuv420p", "--crf=18", "--muted", "--log=error"], { cwd: ctx.remotion });
  const master = join(ctx.render, "master.mp4");
  copyFileSync(join(ctx.remotion, "out", "master.mp4"), master);
  return master;
}

const ff = (args) => run(ffmpegBin(), ["-v", "error", "-y", ...args]);
const size = (path) => statSync(path).size;

/** All the outputs, in the clip folder. Returns what the check step needs to know about the ladders. */
export function encodeAll(ctx, story, take) {
  const master = join(ctx.render, "master.mp4");
  if (!existsSync(master)) throw new Error("no master.mp4: run the `render` step first");
  const out = (extension) => join(ctx.clipDir, `${ctx.name}.${extension}`);
  const used = {};

  // MP4: the master remuxed; re-encoded at a higher CRF only when over budget.
  let mp4Crf = "master";
  for (const crf of MP4_LADDER) {
    if (crf === undefined) ff(["-i", master, "-c:v", "copy", "-an", "-movflags", "+faststart", out("mp4")]);
    else ff(["-i", master, "-c:v", "libx264", "-crf", String(crf), "-pix_fmt", "yuv420p", "-an", "-movflags", "+faststart", out("mp4")]);
    mp4Crf = crf ?? "master (crf 18)";
    if (size(out("mp4")) <= BUDGETS.mp4) break;
  }
  used.mp4 = { crf: mp4Crf };

  ff(["-i", master, "-c:v", "libvpx-vp9", "-crf", "34", "-b:v", "0", "-row-mt", "1", "-deadline", "good", "-cpu-used", "2", "-pix_fmt", "yuv420p", "-an", out("webm")]);

  let gifStep = 0;
  for (const [index, step] of GIF_LADDER.entries()) {
    const width = Math.min(step.width, story.width);
    const graph = `fps=${step.fps},scale=${width}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=${step.colors}:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`;
    ff(["-i", master, "-filter_complex", graph, "-loop", "0", out("gif")]);
    gifStep = index;
    if (size(out("gif")) <= BUDGETS.gif) break;
  }
  used.gif = { step: gifStep, ...GIF_LADDER[gifStep], width: Math.min(GIF_LADDER[gifStep].width, story.width) };

  // Pictures.
  // The key frames: the folder is emptied first, so no frame of an earlier render stays.
  const frames = join(ctx.clipDir, "frames");
  rmSync(frames, { recursive: true, force: true });
  mkdirSync(frames, { recursive: true });
  const total = Math.round(story.length * story.fps);
  const at = (seconds, file) => ff(["-ss", seconds.toFixed(3), "-i", out("mp4"), "-frames:v", "1", file]);
  const copy = take.presses[0];
  const paste = take.presses.at(-1);
  at(0, join(ctx.clipDir, "poster.png"));
  at(copy.t / story.rate - 0.05, join(frames, "01-selected.png"));
  at(paste.t / story.rate + 0.3, join(frames, "02-pasted.png"));
  const zoomIn = take.zooms[0].t / story.rate + 0.6;
  at((zoomIn + story.zoom.holdTo) / 2, join(frames, "03-zoomed.png"));
  // One frame per mark, at the middle of its range, numbered from 04 in the storyboard's order.
  for (const [index, mark] of story.marks.entries()) {
    at((mark.from + mark.to) / 2, join(frames, `${String(index + 4).padStart(2, "0")}-mark-${mark.id}.png`));
  }

  const font = filterPath(fontFile());
  const label = `drawtext=fontfile='${font}':text='%{pts\\:hms}':x=6:y=6:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.6`;
  ff(["-i", out("mp4"), "-vf", `fps=12/${story.length},scale=480:-1,${label},tile=4x3`, "-frames:v", "1", join(ctx.clipDir, "contact-sheet.png")]);

  // The loop seam: frame 0 and the last frame, side by side.
  const lastFrame = join(ctx.render, "last.png");
  ff(["-i", out("mp4"), "-vf", `select=eq(n\\,${total - 1})`, "-fps_mode", "passthrough", "-frames:v", "1", lastFrame]);
  const banner = `drawtext=fontfile='${font}':text='Loop seam, left frame 0, right last frame. Judge the fade as watched.':x=(w-tw)/2:y=12:fontsize=30:fontcolor=white:box=1:boxcolor=black@0.7`;
  ff(["-i", join(ctx.clipDir, "poster.png"), "-i", lastFrame, "-filter_complex", `[0]scale=960:-1[l];[1]scale=960:-1[r];[l][r]hstack,${banner}`, "-frames:v", "1", join(ctx.clipDir, "first-last.png")]);
  writeFileSync(join(ctx.render, "encode.json"), JSON.stringify(used, null, 1));
  return used;
}

export const readEncode = (ctx) => JSON.parse(readFileSync(join(ctx.render, "encode.json"), "utf8"));
