// Probes every output of a clip and writes check.json. Fails (throws) unless every line holds.
import { spawnSync } from "node:child_process";
import { existsSync, openSync, readSync, closeSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { BUDGETS, readEncode } from "./encode.mjs";
import { ffmpegBin, ffprobeBin, output } from "./platform.mjs";

const MB = 1024 * 1024;

function probe(file) {
  return JSON.parse(output(ffprobeBin(), ["-v", "error", "-print_format", "json", "-show_streams", "-show_format", file]));
}

const fraction = (text) => {
  const [a, b] = text.split("/").map(Number);
  return b ? a / b : a;
};

/** The names of the top-level boxes of an MP4, in order. */
export function topLevelBoxes(file) {
  const fd = openSync(file, "r");
  const boxes = [];
  try {
    const total = statSync(file).size;
    let position = 0;
    const header = Buffer.alloc(16);
    while (position + 8 <= total && boxes.length < 64) {
      readSync(fd, header, 0, 16, position);
      let length = header.readUInt32BE(0);
      boxes.push(header.toString("latin1", 4, 8));
      if (length === 1) length = Number(header.readBigUInt64BE(8));
      if (length === 0) break;
      position += length;
    }
  } finally {
    closeSync(fd);
  }
  return boxes;
}

/** The loop count of a GIF's NETSCAPE2.0 application extension, or undefined when there is none. */
export function gifLoopCount(file) {
  const bytes = readFileSync(file);
  const at = bytes.indexOf("NETSCAPE2.0", 0, "latin1");
  if (at < 0) return undefined;
  // identifier (11 bytes), then the sub-block: size 3, id 1, count (little endian, 2 bytes).
  return bytes.readUInt16LE(at + 11 + 2);
}

function ssim(first, second) {
  const result = spawnSync(ffmpegBin(), ["-v", "info", "-i", first, "-i", second, "-lavfi", "ssim", "-f", "null", "-"], { encoding: "utf8" });
  const match = /All:([\d.]+)/u.exec(`${result.stderr}`);
  if (!match) throw new Error("ffmpeg gave no SSIM value");
  return Number(match[1]);
}

export function checkClip(ctx, story) {
  const results = [];
  const values = {};
  const want = (name, ok, value, detail = "") => {
    results.push({ name, ok, value, detail });
    console.log(`${ok ? "ok  " : "FAIL"} ${name}: ${value}${detail ? ` (${detail})` : ""}`);
  };
  const file = (extension) => join(ctx.clipDir, `${ctx.name}.${extension}`);
  for (const extension of ["mp4", "webm", "gif"]) if (!existsSync(file(extension))) throw new Error(`${ctx.name}.${extension} does not exist: run the render step`);
  const used = readEncode(ctx);
  const take = JSON.parse(readFileSync(join(ctx.take, "take.json"), "utf8"));
  const verify = JSON.parse(readFileSync(join(ctx.take, "verify.json"), "utf8"));
  const host = JSON.parse(readFileSync(ctx.takeHostFile, "utf8"));
  const frame = 1 / story.fps;

  // MP4.
  const mp4 = probe(file("mp4"));
  const video = mp4.streams.find((s) => s.codec_type === "video");
  const duration = Number(mp4.format.duration);
  const boxes = topLevelBoxes(file("mp4"));
  const mp4Size = statSync(file("mp4")).size;
  values.mp4 = { seconds: Math.round(duration * 1000) / 1000, width: video.width, height: video.height, fps: fraction(video.r_frame_rate), codec: video.codec_name, pixFmt: video.pix_fmt, audioStreams: mp4.streams.filter((s) => s.codec_type === "audio").length, bytes: mp4Size, crf: used.mp4.crf };
  want("mp4 duration within 5 to 12 s", duration >= 5 && duration <= 12, `${duration.toFixed(3)} s`);
  want("mp4 duration equals Length within one frame", Math.abs(duration - story.length) <= frame + 1e-3, `${duration.toFixed(3)} s vs ${story.length} s`);
  want("mp4 size", video.width === story.width && video.height === story.height, `${video.width}x${video.height}`, `storyboard ${story.width}x${story.height}`);
  want(`mp4 ${story.fps} fps`, fraction(video.r_frame_rate) === story.fps, video.r_frame_rate);
  want("mp4 h264 yuv420p", video.codec_name === "h264" && video.pix_fmt === "yuv420p", `${video.codec_name} ${video.pix_fmt}`);
  want("mp4 has no audio stream", values.mp4.audioStreams === 0, String(values.mp4.audioStreams));
  want("mp4 faststart", boxes.indexOf("moov") >= 0 && boxes.indexOf("moov") < boxes.indexOf("mdat"), boxes.join(","));
  want("mp4 at most 10 MB", mp4Size <= BUDGETS.mp4, `${(mp4Size / MB).toFixed(2)} MB`, `crf ${used.mp4.crf}`);

  // WebM.
  const webm = probe(file("webm"));
  const wv = webm.streams.find((s) => s.codec_type === "video");
  const webmSize = statSync(file("webm")).size;
  const webmDuration = Number(webm.format.duration);
  values.webm = { seconds: Math.round(webmDuration * 1000) / 1000, width: wv.width, height: wv.height, fps: fraction(wv.r_frame_rate), codec: wv.codec_name, audioStreams: webm.streams.filter((s) => s.codec_type === "audio").length, bytes: webmSize };
  want("webm vp9", wv.codec_name === "vp9", wv.codec_name);
  want("webm same size, fps and duration", wv.width === story.width && wv.height === story.height && fraction(wv.r_frame_rate) === story.fps && Math.abs(webmDuration - duration) <= 2 * frame, `${wv.width}x${wv.height} ${wv.r_frame_rate} ${webmDuration.toFixed(3)} s`);
  want("webm has no audio stream", values.webm.audioStreams === 0, String(values.webm.audioStreams));
  want("webm at most 3 MB", webmSize <= BUDGETS.webm, `${(webmSize / MB).toFixed(2)} MB`);

  // GIF.
  const gif = probe(file("gif"));
  const gv = gif.streams.find((s) => s.codec_type === "video");
  const gifSize = statSync(file("gif")).size;
  const loop = gifLoopCount(file("gif"));
  values.gif = { width: gv.width, fps: fraction(gv.r_frame_rate), bytes: gifSize, loopCount: loop, ladderStep: used.gif.step, colors: used.gif.colors };
  want("gif width and fps are the ladder's", gv.width === used.gif.width && Math.round(fraction(gv.r_frame_rate)) === used.gif.fps, `${gv.width} px, ${gv.r_frame_rate}`, `ladder step ${used.gif.step}`);
  want("gif at most 3 MB", gifSize <= BUDGETS.gif, `${(gifSize / MB).toFixed(2)} MB`);
  want("gif NETSCAPE2.0 loop count 0", loop === 0, String(loop));

  // The loop seam.
  const seam = ssim(join(ctx.clipDir, "poster.png"), join(ctx.render, "last.png"));
  values.loopSeamSsim = seam;
  want("loop seam SSIM at least 0.98 and below 1.0", seam >= 0.98 && seam < 1, seam.toFixed(5));

  // The take.
  want("scenario verify passed", verify.passed === true, String(verify.passed));
  want("no paste-options widget after the paste", verify.notes?.pasteWidgets === 0, String(verify.notes?.pasteWidgets));
  want("Studio in reading mode at the start", verify.notes?.readingMode === "off", String(verify.notes?.readingMode));
  want("screencast at least the storyboard's frame rate after retiming", story.fps <= 30, "30 (retimed by ffmpeg)", `raw ${take.rawFps} fps, storyboard ${story.fps} fps`);
  want("playback rate inside 0.77 to 1.3", story.rate >= 0.77 && story.rate <= 1.3, story.rate.toFixed(3));

  const report = {
    clip: ctx.name,
    passed: results.every((r) => r.ok),
    length: story.length,
    mp4: values.mp4,
    webm: values.webm,
    gif: { ...values.gif, step: used.gif },
    loopSeamSsim: values.loopSeamSsim,
    take: { rawFps: take.rawFps, screencastFrames: take.screencastFrames, filmedSeconds: take.filmed, playbackRate: Math.round(story.rate * 1000) / 1000, readingMode: verify.notes?.readingMode, pasteWidgets: verify.notes?.pasteWidgets, verifyPassed: verify.passed },
    host,
    checks: results,
  };
  writeFileSync(join(ctx.clipDir, "check.json"), `${JSON.stringify(report, null, 2)}\n`);
  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) throw new Error(`${failed.length} check(s) failed: ${failed.map((r) => r.name).join("; ")}`);
  return report;
}
