import * as fs from "node:fs";
import * as path from "node:path";

import { E2E_REPORT_ROOT, E2E_SCREENSHOT_ROOT, EXTENSION_ROOT } from "../reportPaths";
import { CAPTURES } from "../shared/captureRegistry";

interface GallerySelection {
  /** Capture id in the real-input run folder (`<group>/rNN-<slug>`); the registry says it is curated. */
  id: string;
  /** File below `images/`; named by the registry (`curated`). */
  file: string;
  title: string;
  description: string;
}

const MIME_TYPES: Record<string, string> = {
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".webm": "video/webm",
  ".webp": "image/webp",
};

const selections: GallerySelection[] = [
  {
    id: "block-editing/r01-paragraph-blur-commit",
    file: "01-paragraph-blur-commit.png",
    title: "Commit an edited paragraph",
    description: "A real preview edit is committed into the VS Code document buffer.",
  },
  {
    id: "block-editing/r12-edit-hover",
    file: "21-edit-hover.png",
    title: "Reveal the edit affordance",
    description: "A real hover state shows which rendered block will be edited.",
  },
  {
    id: "lifecycle-sync/r08-edit-mode-remembered",
    file: "38-edit-mode-remembered.png",
    title: "MyST and diagrams on white",
    description: "A white preview renders nested MyST admonitions, a Mermaid flowchart, and a local SVG with edit mode restored.",
  },
];

function fail(message: string): never {
  throw new Error(`Cannot curate E2E gallery: ${message}`);
}

function findSuccessfulRealInputRun(): string {
  const reviewPath = path.join(E2E_REPORT_ROOT, "review.json");
  if (!fs.existsSync(reviewPath)) fail("the final review report is missing");
  const review = JSON.parse(fs.readFileSync(reviewPath, "utf8")) as { status?: string; runId?: string };
  if (review.status !== "passed") fail("the final review report is not passed");
  if (!review.runId) fail("the final review report has no campaign identity");

  const latestPath = path.join(E2E_SCREENSHOT_ROOT, "REAL-INPUT-LATEST.md");
  if (!fs.existsSync(latestPath)) fail("the real-input latest pointer is missing");
  const latest = fs.readFileSync(latestPath, "utf8");
  if (!/Suite:\s+\*\*passed\*\*/u.test(latest)) fail("the real-input suite is not passed");
  if (!latest.includes(`Run identity: \`${review.runId}\``)) fail("the real-input latest pointer is stale");
  const match = /\[Ordered captures\]\(([^)]+)\/INDEX\.md\)/u.exec(latest);
  if (!match) fail("the real-input latest pointer has no capture directory");
  const directory = path.resolve(E2E_SCREENSHOT_ROOT, match[1]);
  const relative = path.relative(E2E_SCREENSHOT_ROOT, directory);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative) || !relative.startsWith("real-input-")) {
    fail("the latest pointer escapes the real-input screenshot root");
  }
  if (!fs.existsSync(path.join(directory, "INDEX.md"))) fail("the real-input capture index is missing");
  const manifestPath = path.join(directory, "manifest.json");
  if (!fs.existsSync(manifestPath)) fail("the real-input manifest is missing");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as { runId?: string; status?: string };
  if (manifest.runId !== review.runId || manifest.status !== "passed") fail("the real-input manifest is stale or failed");
  return directory;
}

function copySelection(sourceDirectory: string, selection: GallerySelection): {
  image: string;
  source: string;
  capturedAt: string;
  bytes: number;
  mediaType: "image" | "video";
  mimeType: string;
  title: string;
  description: string;
} {
  const registered = CAPTURES.find((entry) => entry.id === selection.id);
  if (registered === undefined || registered.suite !== "real-input" || registered.curated !== selection.file) {
    fail(`${selection.id} is not registered as the curated source of images/${selection.file}`);
  }
  const source = path.join(sourceDirectory, `${selection.id}.png`);
  if (!fs.existsSync(source)) fail(`required capture ${selection.id} is missing`);
  const extension = path.extname(selection.file).toLowerCase();
  const mimeType = MIME_TYPES[extension];
  if (!mimeType) fail(`unsupported gallery media type ${selection.file}`);
  const note = path.join(sourceDirectory, `${selection.id}.md`);
  if (!fs.existsSync(note)) fail(`sidecar note for ${selection.id} is missing`);
  const destination = path.join(EXTENSION_ROOT, "images", selection.file);
  fs.copyFileSync(source, destination);
  const metadata = fs.statSync(source);
  return {
    image: `images/${selection.file}`,
    source: path.relative(EXTENSION_ROOT, source).split(path.sep).join("/"),
    capturedAt: metadata.mtime.toISOString(),
    bytes: metadata.size,
    mediaType: mimeType.startsWith("video/") ? "video" : "image",
    mimeType,
    title: selection.title,
    description: selection.description,
  };
}

const sourceDirectory = findSuccessfulRealInputRun();
const imageDirectory = path.join(EXTENSION_ROOT, "images");
fs.mkdirSync(imageDirectory, { recursive: true });
const gallery = selections.map((selection) => copySelection(sourceDirectory, selection));
fs.writeFileSync(path.join(imageDirectory, "gallery.json"), JSON.stringify({
  generatedAt: new Date().toISOString(),
  sourceDirectory: path.relative(EXTENSION_ROOT, sourceDirectory).split(path.sep).join("/"),
  captures: gallery,
}, null, 2) + "\n");
console.log(`Curated ${gallery.length} real-window captures from ${sourceDirectory}`);
