// Host differences of the clip kit: scratch folder, VS Code, process kill, file URLs, the modifier key,
// the display. Nothing here is specific to one clip.
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const IS_WIN = process.platform === "win32";
export const IS_MAC = process.platform === "darwin";
export const PLATFORM = process.platform;

/** The VS Code version every take films. Move it by hand when a clip is remade on a newer one. */
export const DEFAULT_CODE_VERSION = "1.147.0";
export const REPO_ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "..", "..", "..", "..");

/** The window of a take, in logical pixels. */
export const WINDOW = { width: 1280, height: 720 };
/** Device scales tried from the largest, and the smallest display that holds the window at the smallest scale. */
export const SCALES = [2, 1.75, 1.5];

export function scratchRoot() {
  const root = process.env.CLIP_SCRATCH || (IS_MAC ? "/private/tmp/okfclip" : join(tmpdir(), "okfclip"));
  mkdirSync(root, { recursive: true });
  return root;
}

export const fileUrl = (path) => pathToFileURL(path).href;
export const forwardSlashes = (path) => path.replaceAll("\\", "/");
export const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

/** The key name of the platform modifier in a `press` chord, and the text a badge shows for it. */
export const modifierKey = () => (IS_MAC ? "Meta" : "Control");
export const expandChord = (chord) => chord.replaceAll("ControlOrMeta", modifierKey());
export const modifierLabel = () => (IS_MAC ? "\u2318" : "Ctrl");

/** An environment without the variables a VS Code terminal leaks into a child VS Code. */
export function cleanEnv() {
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (/^(VSCODE_|ELECTRON_|__CFBundle)/.test(key)) delete env[key];
  return env;
}

const quote = (value) => `"${String(value).replaceAll('"', '\\"')}"`;

/** Runs a command to its end. The VS Code CLI, npm and npx are .cmd files on Windows: shell, every argument quoted. */
export function run(command, args, options = {}) {
  const { shell = false, ...rest } = options;
  const useShell = shell && IS_WIN;
  const result = useShell
    ? // A bare command name stays unquoted: a quoted `"npm"` makes %~dp0 of npm.cmd the working folder, and npm is not found.
      spawnSync([/\s/u.test(command) ? quote(command) : command, ...args.map(quote)].join(" "), { shell: true, stdio: "inherit", ...rest })
    : spawnSync(command, args, { stdio: "inherit", ...rest });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.slice(0, 3).join(" ")} failed with status ${result.status}`);
  return result;
}

export function output(command, args, options = {}) {
  return execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...options });
}

export function launch(command, args, options = {}) {
  const child = spawn(command, args, { stdio: "ignore", detached: !IS_WIN, ...options });
  child.unref();
  return child;
}

/** Kills a process and its helpers: VS Code leaves helpers running on Windows. */
export function killTree(pid) {
  if (!pid) return;
  try {
    if (IS_WIN) spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
    else process.kill(pid);
  } catch {
    // already gone
  }
}

/** A module of the repository's node_modules (playwright-core, @vscode/test-electron). */
export function repoRequire(name) {
  return createRequire(join(REPO_ROOT, "package.json"))(name);
}

/** The work area of the primary display in physical pixels: { width, height }. */
export function displayWorkArea() {
  const override = process.env.CLIP_DISPLAY_OVERRIDE;
  if (override) {
    const match = /^(\d+)x(\d+)$/u.exec(override);
    if (!match) throw new Error(`CLIP_DISPLAY_OVERRIDE must look like 1280x720, got "${override}"`);
    return { width: Number(match[1]), height: Number(match[2]), overridden: true };
  }
  if (IS_WIN) {
    const text = output("powershell", ["-NoProfile", "-Command", "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea | ConvertTo-Json -Compress"]);
    const area = JSON.parse(text);
    return { width: area.Width, height: area.Height };
  }
  if (IS_MAC) {
    const text = output("osascript", ["-e", 'tell application "Finder" to get bounds of window of desktop']).trim();
    const [left, top, right, bottom] = text.split(",").map((part) => Number(part.trim()));
    // Finder reports points; the physical size of a Retina display is twice that, but the work area the window sits in is what matters here.
    return { width: right - left, height: bottom - top, points: true };
  }
  throw new Error(`The clip kit measures the display on Windows and macOS only, not on ${process.platform}`);
}

/** The largest device scale whose window fits the work area, or undefined. macOS reports points: they count at scale 1 per point. */
export function pickScale(area) {
  const unit = area.points ? 2 : 1;
  for (const scale of SCALES) {
    if (WINDOW.width * scale <= area.width * unit && WINDOW.height * scale <= area.height * unit) return scale;
  }
  return undefined;
}

export function displayProblem(area) {
  const needed = `${WINDOW.width * SCALES.at(-1)}x${WINDOW.height * SCALES.at(-1)}`;
  return `The display is too small: no device scale fits. The take needs a work area of at least ${needed} physical pixels (1.5 times ${WINDOW.width}x${WINDOW.height}); this one measures ${area.width}x${area.height}${area.overridden ? " (CLIP_DISPLAY_OVERRIDE)" : ""}.`;
}

/** Fails with the display message when no scale fits; returns the scale and the measured area. */
export function checkDisplay() {
  const area = displayWorkArea();
  const scale = pickScale(area);
  if (scale === undefined) throw new Error(displayProblem(area));
  return { scale, area };
}

/** A font file for ffmpeg's drawtext. */
export function fontFile() {
  const candidates = IS_WIN
    ? ["C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/segoeui.ttf"]
    : IS_MAC
      ? ["/System/Library/Fonts/Supplemental/Arial.ttf", "/System/Library/Fonts/Helvetica.ttc"]
      : ["/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"];
  const found = candidates.find((path) => existsSync(path));
  if (!found) throw new Error(`No font file found for ffmpeg drawtext, looked in ${candidates.join(", ")}`);
  return found;
}

/** A path inside an ffmpeg filter argument: forward slashes and an escaped drive colon. */
export const filterPath = (path) => forwardSlashes(path).replace(/^([A-Za-z]):/u, "$1\\:");

export const ffmpegBin = () => process.env.FFMPEG || "ffmpeg";
export const ffprobeBin = () => process.env.FFPROBE || "ffprobe";
