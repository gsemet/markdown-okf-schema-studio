// The feature clip kit: node docs/demo-video/clip-kit/clip.mjs <clip folder> <step> [--vsix <path>]
// Steps: doctor, setup, take, render, check, all (= setup, take, render, check).
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { checkClip } from "./lib/check.mjs";
import { encodeAll, installRemotion, remotionReady, renderMaster } from "./lib/encode.mjs";
import {
  DEFAULT_CODE_VERSION, IS_MAC, displayProblem, displayWorkArea, ffmpegBin, ffprobeBin, output, pickScale, repoRequire,
} from "./lib/platform.mjs";
import { makeContext, setupProfile } from "./lib/profile.mjs";
import { prepare } from "./lib/prepare.mjs";
import { buildStory } from "./lib/storyboard.mjs";
import { runTake } from "./lib/take.mjs";

const STEPS = ["doctor", "setup", "take", "render", "check", "all"];

function parseArguments(argv) {
  const [clipFolder, step = "all", ...rest] = argv;
  const flags = {};
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === "--vsix") flags.vsix = rest[++i];
    else throw new Error(`unknown argument ${rest[i]}`);
  }
  if (!clipFolder || !STEPS.includes(step)) throw new Error(`usage: clip.mjs <clip folder> <${STEPS.join("|")}> [--vsix <path>]`);
  return { clipFolder, step, flags };
}

async function loadScenario(ctx) {
  const file = join(ctx.clipDir, "scenario.mjs");
  if (!existsSync(file)) throw new Error(`no scenario.mjs in ${ctx.clipDir}`);
  return import(pathToFileURL(file).href);
}

function doctor(ctx) {
  const lines = [];
  let failed = false;
  const report = (ok, name, detail, fix) => {
    if (!ok) failed = true;
    lines.push(`${ok ? "ok  " : "FAIL"} ${name}: ${detail}${ok || !fix ? "" : `\n       fix: ${fix}`}`);
  };
  const note = (name, detail) => lines.push(`todo ${name}: ${detail}`);

  const major = Number(process.versions.node.split(".")[0]);
  report(major >= 24, "Node.js 24", process.versions.node, "install Node.js 24 (see .nvmrc; `fnm use`)");

  const ffInstall = IS_MAC ? "brew install ffmpeg" : "scoop install ffmpeg";
  for (const [label, bin] of [["ffmpeg", ffmpegBin()], ["ffprobe", ffprobeBin()]]) {
    try {
      report(true, label, output(bin, ["-version"]).split("\n")[0]);
    } catch {
      report(false, label, "not found on PATH", `${ffInstall} (or set ${label.toUpperCase()} to the executable)`);
    }
  }
  try {
    const encoders = output(ffmpegBin(), ["-hide_banner", "-encoders"]);
    for (const encoder of ["libx264", "libvpx-vp9", "gif"]) {
      report(new RegExp(`\\s${encoder}\\s`, "u").test(encoders), `ffmpeg encoder ${encoder}`, "checked", `use a full ffmpeg build (${ffInstall})`);
    }
  } catch {
    // reported above
  }
  for (const module of ["playwright-core", "@vscode/test-electron"]) {
    try {
      repoRequire(module);
      report(true, `repository module ${module}`, "found");
    } catch {
      report(false, `repository module ${module}`, "not found", "run `just dev` (or `fnm exec -- npm ci`)");
    }
  }
  try {
    mkdirSync(ctx.scratch, { recursive: true });
    writeFileSync(join(ctx.scratch, ".write-test"), "ok");
    rmSync(join(ctx.scratch, ".write-test"));
    report(true, "scratch folder writable", ctx.scratch.replaceAll("\\", "/").replace(/^.*\/(okfclip.*)$/u, "$1"));
  } catch (error) {
    report(false, "scratch folder writable", String(error.message), "set CLIP_SCRATCH to a writable folder");
  }
  if (remotionReady(ctx)) report(true, "Remotion install", "found in the scratch folder");
  else note("Remotion install", "absent; `setup` installs it into the scratch folder");
  if (process.env.DEMO_CODE) {
    report(existsSync(process.env.DEMO_CODE), "VS Code (DEMO_CODE)", "local install", "point DEMO_CODE at a VS Code executable");
  } else {
    const cache = join(ctx.scratch, "vscode");
    const downloaded = existsSync(cache) && readdirSync(cache).some((entry) => entry.includes(DEFAULT_CODE_VERSION));
    if (downloaded) report(true, `VS Code ${DEFAULT_CODE_VERSION}`, "downloaded");
    else note(`VS Code ${DEFAULT_CODE_VERSION}`, "not downloaded; `setup` downloads it");
  }
  try {
    const area = displayWorkArea();
    const scale = pickScale(area);
    report(scale !== undefined, "display", scale !== undefined ? `${area.width}x${area.height}${area.overridden ? " (CLIP_DISPLAY_OVERRIDE)" : ""}, device scale ${scale}` : displayProblem(area), "use a display with a work area of at least 1920x1080 physical pixels");
  } catch (error) {
    report(false, "display", String(error.message));
  }
  console.log(lines.join("\n"));
  if (failed) throw new Error("doctor found problems (see FAIL lines above)");
}

async function setup(ctx) {
  const scenario = await loadScenario(ctx);
  installRemotion(ctx);
  const { host } = await setupProfile(ctx, scenario);
  console.log(`setup done: VS Code ${host.vscodeVersion}${host.vscodePinned ? " (pinned)" : ""}, extension ${host.extensionVersion} from ${host.extensionSource}, device scale ${host.deviceScale}`);
}

async function take(ctx) {
  const scenario = await loadScenario(ctx);
  if (!existsSync(ctx.hostFile)) throw new Error("no profile: run the `setup` step first");
  await runTake(ctx, scenario);
  prepare(ctx);
}

function render(ctx) {
  if (!existsSync(join(ctx.take, "take.json"))) throw new Error("no take: run the `take` step first (a failed take leaves nothing to render)");
  if (!existsSync(join(ctx.render, "clip.mp4"))) throw new Error("no clip.mp4: the last take failed or was never run");
  const story = buildStory(ctx);
  console.log(`storyboard ok: ${story.length} s, playback rate ${story.rate.toFixed(2)}`);
  renderMaster(ctx);
  const take = JSON.parse(readFileSync(join(ctx.take, "take.json"), "utf8"));
  const used = encodeAll(ctx, story, take);
  console.log("encoded", JSON.stringify(used));
}

function check(ctx) {
  const story = JSON.parse(readFileSync(join(ctx.render, "story.json"), "utf8"));
  checkClip(ctx, story);
}

async function main() {
  const { clipFolder, step, flags } = parseArguments(process.argv.slice(2));
  const ctx = makeContext(clipFolder, flags);
  console.log(`clip ${ctx.name}, step ${step}, platform ${process.platform}`);
  const run = { doctor: () => doctor(ctx), setup: () => setup(ctx), take: () => take(ctx), render: () => render(ctx), check: () => check(ctx) };
  const steps = step === "all" ? ["setup", "take", "render", "check"] : [step];
  for (const name of steps) {
    console.log(`\n== ${name}`);
    await run[name]();
  }
  console.log("\ndone");
}

main().catch((error) => {
  console.error(`\nFAILED: ${error.message}`);
  process.exit(1);
});
