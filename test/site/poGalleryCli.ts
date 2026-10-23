import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { E2E_REPORT_ROOT, E2E_SCREENSHOT_ROOT, EXTENSION_ROOT } from "../reportPaths";
import { CAPTURES, RUN_FOLDER_PREFIX, SUITES, type CaptureSuite } from "../shared/captureRegistry";
import { GROUPS, INTEGRATION_TESTS } from "../shared/e2eGroups";
import { SCENARIOS } from "../visual/scenarios";
import { buildPoGallery, type GalleryOutput, type RealCaptureRow, type RealWindowLink, type VisualManifest } from "./poGallery";

const POINTERS: readonly { file: string; label: string }[] = [
  { file: "LATEST.md", label: "Scroll synchronization (real window)" },
  { file: "REAL-INPUT-LATEST.md", label: "Real-input editing" },
  { file: "../FRONTMATTER-LATEST.md", label: "Frontmatter and link interactions" },
  { file: "../RELOAD-LATEST.md", label: "Reload and close/reopen" },
  { file: "../CHECKBOX-LATEST.md", label: "Checkbox toggles" },
  { file: "UNTRUSTED-LATEST.md", label: "Restricted Mode window" },
];

/** The "ordered captures" link of each real-window LATEST pointer, relative to `out/reports/e2e/`. */
export function latestRunLinks(): RealWindowLink[] {
  const links: RealWindowLink[] = [];
  for (const pointer of POINTERS) {
    const file = path.join(E2E_SCREENSHOT_ROOT, pointer.file);
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, "utf8");
    const match = /\]\(([^)]+INDEX\.md)\)/u.exec(content);
    if (match === null) continue;
    const target = path.resolve(path.dirname(file), match[1]!);
    if (!fs.existsSync(target)) continue;
    const status = /(?:Suite: \*\*|Status: \**)(\w+)/u.exec(content)?.[1];
    links.push({
      label: pointer.label,
      href: path.relative(E2E_REPORT_ROOT, target).split(path.sep).join("/"),
      ...(status === undefined ? {} : { note: status }),
    });
  }
  return links;
}

/** The LATEST pointer of each real-window suite (relative to `screenshots/`). */
const SUITE_POINTER: Readonly<Record<CaptureSuite, string>> = {
  "real-input": "REAL-INPUT-LATEST.md",
  checkbox: "../CHECKBOX-LATEST.md",
  frontmatter: "../FRONTMATTER-LATEST.md",
  scroll: "LATEST.md",
  reload: "../RELOAD-LATEST.md",
  untrusted: "UNTRUSTED-LATEST.md",
};

interface RunCapture {
  readonly id: string;
  readonly png: string | null;
  readonly note: string;
}

/** Run folder named by the pointer of `suite`, with the `captures` of its manifest. */
export function latestRun(suite: CaptureSuite): { folder: string; status?: string; captures: readonly RunCapture[] } | undefined {
  const pointer = path.join(E2E_SCREENSHOT_ROOT, SUITE_POINTER[suite]);
  if (!fs.existsSync(pointer)) return undefined;
  const content = fs.readFileSync(pointer, "utf8");
  const link = /\]\(([^)]+)\/INDEX\.md\)/u.exec(content)?.[1];
  if (link === undefined) return undefined;
  const directory = path.resolve(path.dirname(pointer), link);
  const folder = path.relative(E2E_SCREENSHOT_ROOT, directory).split(path.sep).join("/");
  if (folder.startsWith("..") || !path.basename(folder).startsWith(RUN_FOLDER_PREFIX[suite])) return undefined;
  const manifestPath = path.join(directory, "manifest.json");
  if (!fs.existsSync(manifestPath)) return undefined;
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as { captures?: unknown; status?: string; suiteResult?: string };
  if (!Array.isArray(manifest.captures)) return { folder, captures: [] };
  const status = manifest.status ?? manifest.suiteResult;
  return {
    folder,
    ...(status === undefined ? {} : { status }),
    captures: (manifest.captures as RunCapture[]).filter((capture) => typeof capture?.id === "string"),
  };
}

/** Every registered capture with the files the latest run of its suite wrote for it. */
export function realCaptureRows(): RealCaptureRow[] {
  const runs = new Map(SUITES.map((suite) => [suite, latestRun(suite)]));
  return CAPTURES.map((entry): RealCaptureRow => {
    const run = runs.get(entry.suite);
    const taken = run?.captures.find((capture) => capture.id === entry.id);
    return {
      id: entry.id,
      group: entry.group,
      suite: entry.suite,
      locks: entry.locks,
      assertionOnly: entry.capture === false,
      ...(entry.readme !== undefined || entry.curated !== undefined ? { readme: true } : {}),
      ...(taken?.png ? { png: `${run!.folder}/${taken.png}` } : {}),
      ...(taken ? { note: `${run!.folder}/${taken.note}` } : {}),
      ...(run?.status === undefined ? {} : { runStatus: run.status }),
    };
  });
}

function headRevision(): string | undefined {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: EXTENSION_ROOT, encoding: "utf8" }).trim();
  } catch {
    return undefined;
  }
}

function worktreeStatus(): string | undefined {
  try {
    return execFileSync("git", ["status", "--short"], { cwd: EXTENSION_ROOT, encoding: "utf8" }).trim();
  } catch {
    return undefined;
  }
}

/** Removes `gallery/*.md` pages the new output does not contain (a group that disappeared). */
export function removeStaleGalleryPages(reportRoot: string, files: Readonly<Record<string, string>>): string[] {
  const directory = path.join(reportRoot, "gallery");
  if (!fs.existsSync(directory)) return [];
  const removed: string[] = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    if (Object.hasOwn(files, `gallery/${entry.name}`)) continue;
    fs.rmSync(path.join(directory, entry.name));
    removed.push(`gallery/${entry.name}`);
  }
  return removed;
}

export function generatePoGallery(): GalleryOutput {
  const manifestPath = path.join(E2E_SCREENSHOT_ROOT, "run-manifest.json");
  const manifest = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) as VisualManifest
    : undefined;
  const head = headRevision();
  const status = worktreeStatus();
  const output = buildPoGallery({
    groups: GROUPS,
    scenarios: SCENARIOS,
    integrationTests: INTEGRATION_TESTS,
    ...(manifest === undefined ? {} : { manifest }),
    ...(head === undefined ? {} : { headRevision: head }),
    ...(status === undefined ? {} : { worktreeStatus: status }),
    imageExists: (capture) => fs.existsSync(path.join(E2E_SCREENSHOT_ROOT, capture)),
    realWindow: latestRunLinks(),
    realCaptures: realCaptureRows(),
    generatedAt: new Date().toISOString(),
  });
  removeStaleGalleryPages(E2E_REPORT_ROOT, output.files);
  for (const [relative, content] of Object.entries(output.files)) {
    const target = path.join(E2E_REPORT_ROOT, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  return output;
}

if (require.main === module) {
  const output = generatePoGallery();
  const { totals, freshness } = output;
  console.log(`PO gallery: ${path.join(E2E_REPORT_ROOT, "GALLERY.md")}`);
  console.log(`${totals.scenarios} scenarios, ${totals.withImage} with image, ${totals.assertionOnly} assertion-only, ${totals.stepImages} step images, ${totals.readme} README, ${totals.integration} integration rows, ${Object.keys(output.files).length} pages.`);
  if (freshness.stale) {
    console.log("STALE:");
    for (const reason of freshness.reasons) console.log(`- ${reason}`);
  }
}
