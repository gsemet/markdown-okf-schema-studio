import * as childProcess from "node:child_process";
import { performance } from "node:perf_hooks";
import * as fs from "node:fs";
import * as path from "node:path";

import {
  PreviewDocument,
  SnapshotDiagnostic,
  stageSnapshot,
  StagedPreview,
} from "./snapshotWorkspace";

export type { PreviewDocument } from "./snapshotWorkspace";

export interface ProcessSpawner {
  spawn: typeof childProcess.spawn;
}

const defaultProcessSpawner: ProcessSpawner = { spawn: childProcess.spawn };
let processSpawner: ProcessSpawner = defaultProcessSpawner;
let testCompletionDelayMs = 0;

export interface SphinxBuildOptions {
  document: PreviewDocument;
  workspaceRoot: string;
  /** Package root containing the standalone Sphinx project. */
  sphinxRoot?: string;
  requestId: number;
  documentIdentity?: string;
  rootDirectory?: string;
  signal?: AbortSignal;
  isWorkspaceTrusted: () => boolean;
  getDocument?: (filePath: string) => PreviewDocument | undefined;
}

export interface SphinxDiagnostic extends SnapshotDiagnostic {
  file?: string;
  column?: number;
  severity?: "warning" | "error" | "info";
}

export interface SphinxBuildResult {
  stage: StagedPreview;
  html: string;
  stdout: string;
  stderr: string;
  diagnostics: SphinxDiagnostic[];
  latencyMs: number;
}

export class WorkspaceTrustError extends Error {
  public constructor() {
    super("Sphinx preview is disabled until the workspace is trusted.");
    this.name = "WorkspaceTrustError";
  }
}

export class SphinxBuildCanceledError extends Error {
  public constructor() {
    super("The Sphinx preview build was canceled because a newer snapshot was requested.");
    this.name = "SphinxBuildCanceledError";
  }
}

export class SphinxBuildError extends Error {
  public readonly diagnostics: SphinxDiagnostic[];
  public readonly stdout: string;
  public readonly stderr: string;
  public readonly stage: StagedPreview;

  public constructor(
    message: string,
    stage: StagedPreview,
    diagnostics: SphinxDiagnostic[],
    stdout: string,
    stderr: string,
  ) {
    super(message);
    this.name = "SphinxBuildError";
    this.stage = stage;
    this.diagnostics = diagnostics;
    this.stdout = stdout;
    this.stderr = stderr;
  }
}

export function setProcessSpawnerForTests(spawner: ProcessSpawner): void {
  processSpawner = spawner;
}

export function resetProcessSpawnerForTests(): void {
  processSpawner = defaultProcessSpawner;
  testCompletionDelayMs = 0;
}

export function setSphinxCompletionDelayForTests(delayMs: number): void {
  testCompletionDelayMs = Math.max(0, delayMs);
}

function parseDiagnostics(output: string, stage: StagedPreview): SphinxDiagnostic[] {
  const diagnostics: SphinxDiagnostic[] = [];
  const pattern = /^(.*?):(\d+)(?::(\d+))?:\s*(WARNING|ERROR|INFO):\s*(.*)$/u;
  for (const line of output.split(/\r?\n/u)) {
    const match = line.match(pattern);
    if (!match) {
      continue;
    }
    const stagedFile = path.resolve(match[1]);
    const canonicalStagedFile = (() => {
      try {
        return fs.realpathSync(stagedFile);
      } catch {
        return stagedFile;
      }
    })();
    const file = stage.sourceOrigins.get(canonicalStagedFile)
      ?? stage.sourceOrigins.get(stagedFile)
      ?? match[1];
    const severity = match[4].toLowerCase() as SphinxDiagnostic["severity"];
    diagnostics.push({
      code: "sphinx-diagnostic",
      message: match[5],
      file,
      line: Number(match[2]),
      ...(match[3] ? { column: Number(match[3]) } : {}),
      severity,
      value: line,
    });
  }
  return diagnostics;
}

function diagnosticMessage(diagnostics: readonly SphinxDiagnostic[], output: string): string {
  const first = diagnostics[0];
  if (first) {
    const location = first.file
      ? `${first.file}${first.line ? `:${first.line}` : ""}${first.column ? `:${first.column}` : ""}`
      : "Sphinx";
    return `${location}: ${first.message}`;
  }
  return output.trim() || "Sphinx failed without a diagnostic.";
}

function waitForTestDelay(signal: AbortSignal | undefined): Promise<void> {
  if (testCompletionDelayMs === 0) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    }, testCompletionDelayMs);
    const abort = (): void => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      reject(new SphinxBuildCanceledError());
    };
    if (signal?.aborted) {
      abort();
      return;
    }
    signal?.addEventListener("abort", abort, { once: true });
  });
}

function runSphinx(
  stage: StagedPreview,
  workspaceRoot: string,
  sphinxRoot: string,
  signal: AbortSignal | undefined,
  isWorkspaceTrusted: () => boolean,
): Promise<{ stdout: string; stderr: string }> {
  // Warnings are surfaced as preview diagnostics, so `-W` must stay off:
  // a single missing cross-reference would otherwise fail every render.
  const args = [
    "run",
    "--no-sync",
    "--",
    "sphinx-build",
    "--keep-going",
    "-b",
    "html",
    "-c",
    path.join(sphinxRoot, "sphinx"),
    "-d",
    stage.doctreeDirectory,
    stage.sourceDirectory,
    stage.outputDirectory,
  ];

  return new Promise((resolve, reject) => {
    if (!isWorkspaceTrusted()) {
      reject(new WorkspaceTrustError());
      return;
    }
    if (signal?.aborted) {
      reject(new SphinxBuildCanceledError());
      return;
    }

    let child: childProcess.ChildProcess;
    try {
      child = processSpawner.spawn("uv", args, {
        cwd: sphinxRoot,
        env: {
          ...process.env,
          NO_COLOR: "1",
          PYTHONPATH: [
            path.join(sphinxRoot, "sphinx"),
            process.env.PYTHONPATH,
          ].filter(Boolean).join(path.delimiter),
          SPHINX_PREVIEW_MODE: "1",
          SPHINX_PREVIEW_ACTIVE_FILE: stage.activeDocumentPath,
          SPHINX_PREVIEW_ACTIVE_SOURCE: stage.activeSourcePath,
          SPHINX_PREVIEW_DOCUMENT_ID: stage.activeDocumentIdentity,
          SPHINX_PREVIEW_SOURCE_ORIGINS: JSON.stringify(Object.fromEntries(stage.sourceOrigins)),
        },
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (error) {
      reject(error);
      return;
    }

    let stdout = "";
    let stderr = "";
    let settled = false;
    const cleanup = (): void => {
      signal?.removeEventListener("abort", abort);
    };
    const finish = (callback: () => void): void => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      callback();
    };
    const abort = (): void => {
      if (settled) {
        return;
      }
      child.kill("SIGTERM");
      finish(() => reject(new SphinxBuildCanceledError()));
    };
    child.stdout?.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });
    child.once("error", (error) => finish(() => reject(error)));
    child.once("close", async (code, signalName) => {
      if (code === 0) {
        try {
          await waitForTestDelay(signal);
        } catch (error) {
          finish(() => reject(error));
          return;
        }
      }
      finish(() => {
        if (code === 0) {
          resolve({ stdout, stderr });
          return;
        }
        reject(
          new Error(
            `Sphinx exited with ${signalName ? `signal ${signalName}` : `code ${code}`}.\n${stderr || stdout}`,
          ),
        );
      });
    });
    signal?.addEventListener("abort", abort, { once: true });
  });
}

export async function buildSphinxSnapshot(
  options: SphinxBuildOptions,
): Promise<SphinxBuildResult> {
  const startedAt = performance.now();
  if (!options.isWorkspaceTrusted()) {
    throw new WorkspaceTrustError();
  }
  if (options.signal?.aborted) {
    throw new SphinxBuildCanceledError();
  }

  let stage: StagedPreview | undefined;
  try {
    stage = stageSnapshot({
      document: options.document,
      workspaceRoot: options.workspaceRoot,
      sphinxRoot: options.sphinxRoot,
      requestId: options.requestId,
      documentIdentity: options.documentIdentity,
      rootDirectory: options.rootDirectory,
      getDocument: options.getDocument,
    });
    const processOutput = await runSphinx(
      stage,
      options.workspaceRoot,
      options.sphinxRoot ?? options.workspaceRoot,
      options.signal,
      options.isWorkspaceTrusted,
    );
    const htmlPath = path.join(stage.outputDirectory, "index.html");
    if (!fs.existsSync(htmlPath)) {
      throw new Error("Sphinx completed without producing index.html.");
    }
    const output = `${processOutput.stderr}\n${processOutput.stdout}`;
    return {
      stage,
      html: fs.readFileSync(htmlPath, "utf8"),
      stdout: processOutput.stdout,
      stderr: processOutput.stderr,
      diagnostics: [
        ...stage.diagnostics,
        ...parseDiagnostics(output, stage),
      ],
      latencyMs: performance.now() - startedAt,
    };
  } catch (error) {
    if (error instanceof WorkspaceTrustError || error instanceof SphinxBuildCanceledError) {
      stage?.dispose();
      throw error;
    }
    if (!stage) {
      throw error;
    }
    const stdout = error instanceof SphinxBuildError ? error.stdout : "";
    const stderr = error instanceof SphinxBuildError
      ? error.stderr
      : error instanceof Error
        ? error.message
        : String(error);
    const diagnostics = [
      ...stage.diagnostics,
      ...parseDiagnostics(`${stderr}\n${stdout}`, stage),
    ];
    const buildError = new SphinxBuildError(
      diagnosticMessage(diagnostics, stderr || stdout),
      stage,
      diagnostics,
      stdout,
      stderr,
    );
    stage.dispose();
    throw buildError;
  }
}

export async function renderActiveDocument(
  document: PreviewDocument,
  workspaceRoot: string,
): Promise<SphinxBuildResult> {
  return buildSphinxSnapshot({
    document,
    workspaceRoot,
    requestId: 0,
    isWorkspaceTrusted: () => true,
  });
}
