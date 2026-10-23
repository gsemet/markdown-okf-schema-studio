/**
 * The file side of the shared real-window evidence writer: run folder, per-group sub-folders,
 * notes, INDEX.md and the `captures` list of the run `manifest.json`. The screenshot itself is
 * taken by `test/integration/evidence.ts` (Playwright); this module has no vscode or playwright
 * dependency so it can be unit-tested.
 */
import * as fs from "node:fs";
import * as path from "node:path";

import {
  CAPTURES,
  RUN_FOLDER_PREFIX,
  captureById,
  captureFile,
  missingCaptures,
  type CaptureClip,
  type CaptureEntry,
  type CaptureSuite,
} from "./captureRegistry";
import { instanceIdFromEnvironment } from "./runIsolation";

/** One `captures` entry of the run manifest. Paths are relative to the run folder. */
export interface CaptureRecord {
  readonly id: string;
  readonly group: string;
  readonly suite: CaptureSuite;
  /** `null` for an assertion-only entry (`capture: false`). */
  readonly png: string | null;
  readonly note: string;
  readonly json: string;
  readonly clip: CaptureClip;
  readonly capturedAt: string;
}

export interface EvidenceStoreOptions {
  readonly suite: CaptureSuite;
  /** `out/reports/e2e/screenshots`. */
  readonly screenshotRoot: string;
  readonly environment?: NodeJS.ProcessEnv;
  readonly registry?: readonly CaptureEntry[];
  /** Title of INDEX.md; `false`: the suite writes its own INDEX.md. */
  readonly indexTitle?: string | false;
  readonly instanceId?: string;
}

export interface RecordInput {
  /** What the capture shows: first paragraph of the note. */
  readonly note: string;
  /** Sidecar `.json`; the writer adds `info.id`, `info.suite`, `info.group`, `info.instanceId`. */
  readonly json?: Record<string, unknown>;
  /** Markdown after the note paragraph. */
  readonly markdown?: string;
}

/** Rectangle of the webview frame in page pixels, from `boundingBox()`. */
export interface FrameBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * The Playwright clip for a `preview` capture: the frame rectangle limited to the viewport.
 * `undefined` (capture the whole window) when the rectangle is missing, empty or off screen.
 */
export function resolveClip(
  box: FrameBox | null | undefined,
  viewport: { readonly width: number; readonly height: number } | null | undefined,
): FrameBox | undefined {
  if (box === null || box === undefined) return undefined;
  const values = [box.x, box.y, box.width, box.height];
  if (!values.every(Number.isFinite)) return undefined;
  const x = Math.max(0, Math.floor(box.x));
  const y = Math.max(0, Math.floor(box.y));
  const right = Math.ceil(box.x + box.width);
  const bottom = Math.ceil(box.y + box.height);
  const limitRight = viewport === null || viewport === undefined ? right : Math.min(right, viewport.width);
  const limitBottom = viewport === null || viewport === undefined ? bottom : Math.min(bottom, viewport.height);
  const width = limitRight - x;
  const height = limitBottom - y;
  return width >= 8 && height >= 8 ? { x, y, width, height } : undefined;
}

export class EvidenceStore {
  readonly suite: CaptureSuite;
  readonly directory: string;
  readonly instanceId: string;
  readonly startedAt = new Date().toISOString();
  private readonly registry: readonly CaptureEntry[];
  private readonly records: CaptureRecord[] = [];
  private readonly environment: NodeJS.ProcessEnv;

  constructor(options: EvidenceStoreOptions) {
    this.suite = options.suite;
    this.registry = options.registry ?? CAPTURES;
    this.environment = options.environment ?? process.env;
    this.instanceId = options.instanceId ?? instanceIdFromEnvironment(this.environment);
    fs.mkdirSync(options.screenshotRoot, { recursive: true });
    this.directory = fs.mkdtempSync(path.join(options.screenshotRoot, RUN_FOLDER_PREFIX[options.suite]));
    if (options.indexTitle !== false) {
      fs.writeFileSync(
        path.join(this.directory, "INDEX.md"),
        `# ${options.indexTitle ?? `${options.suite} capture order`}\n\nEntries follow execution order.\n\n`,
      );
    }
  }

  /** The registry entry of `id`; unknown ids are a test bug and fail loudly. */
  entry(id: string): CaptureEntry {
    const found = captureById(id, this.registry);
    if (found === undefined || found.suite !== this.suite) {
      throw new Error(`Unregistered ${this.suite} capture "${id}": add it to test/shared/captureRegistry.ts`);
    }
    return found;
  }

  /** Absolute paths of a capture; creates the group folder. `png` is `null` for assertion-only entries. */
  paths(id: string): { png: string | null; note: string; json: string; entry: CaptureEntry } {
    const entry = this.entry(id);
    const png = path.join(this.directory, captureFile(id, "png"));
    fs.mkdirSync(path.dirname(png), { recursive: true });
    return {
      png: entry.capture === false ? null : png,
      note: path.join(this.directory, captureFile(id, "md")),
      json: path.join(this.directory, captureFile(id, "json")),
      entry,
    };
  }

  /** Writes the notes and registers the capture. The PNG, when expected, must already exist. */
  record(id: string, input: RecordInput): CaptureRecord {
    const target = this.paths(id);
    if (target.png !== null && !fs.existsSync(target.png)) {
      throw new Error(`Capture ${id} was recorded before its PNG was written`);
    }
    if (this.records.some((existing) => existing.id === id)) {
      throw new Error(`Capture ${id} was taken twice in one ${this.suite} run`);
    }
    const capturedAt = new Date().toISOString();
    const info = {
      ...((input.json?.info as Record<string, unknown> | undefined) ?? {}),
      id,
      suite: this.suite,
      group: target.entry.group,
      runId: this.environment.STUDIO_E2E_RUN_ID ?? null,
      instanceId: this.instanceId,
      capturedAt,
      locks: target.entry.locks,
      ...(target.png === null ? { assertionOnly: true } : {}),
    };
    fs.writeFileSync(target.json, `${JSON.stringify({ ...input.json, summary: input.json?.summary ?? input.note, info }, null, 2)}\n`);
    const picture = target.png === null
      ? "Assertion-only: the checks of this capture run, no picture is written.\n\n"
      : "";
    fs.writeFileSync(
      target.note,
      `# ${id}\n\n${input.note}\n\n**Locks:** ${target.entry.locks}\n\n${picture}${input.markdown ?? ""}`,
    );
    const record: CaptureRecord = {
      id,
      group: target.entry.group,
      suite: this.suite,
      png: target.png === null ? null : captureFile(id, "png"),
      note: captureFile(id, "md"),
      json: captureFile(id, "json"),
      clip: target.entry.clip,
      capturedAt,
    };
    this.records.push(record);
    const indexPath = path.join(this.directory, "INDEX.md");
    if (fs.existsSync(indexPath)) {
      fs.appendFileSync(indexPath, `- [${id}](${record.note})${record.png === null ? " (assertion-only)" : `: [image](${record.png})`}\n`);
    }
    return record;
  }

  captured(): string[] {
    return this.records.map((record) => record.id);
  }

  entries(): readonly CaptureRecord[] {
    return this.records;
  }

  /** Expected captures of this suite that were not taken. */
  missing(): string[] {
    return missingCaptures(this.suite, this.captured(), this.registry);
  }

  /** Fails when a registered capture of this suite is missing (call only after a complete run). */
  assertComplete(): void {
    const missing = this.missing();
    if (missing.length > 0) {
      throw new Error(`${missing.length} registered ${this.suite} capture(s) not taken: ${missing.join(", ")}`);
    }
  }

  /** Fields every run manifest carries next to the suite's own ones. */
  manifestFields(): { instanceId: string; suite: CaptureSuite; captures: readonly CaptureRecord[] } {
    return { instanceId: this.instanceId, suite: this.suite, captures: this.records };
  }

  /** Writes `manifest.json` = the suite's own fields + `manifestFields()` (which win). */
  writeManifest(fields: Record<string, unknown>): void {
    fs.writeFileSync(
      path.join(this.directory, "manifest.json"),
      `${JSON.stringify({ ...fields, ...this.manifestFields() }, null, 2)}\n`,
    );
  }
}
