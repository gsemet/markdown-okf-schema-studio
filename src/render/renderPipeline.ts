import { performance } from "node:perf_hooks";
import * as path from "node:path";

import { listGlobDocuments } from "./documentGlob";
import { renderMyst, RenderDiagnostic } from "./mystRenderer";
import {
  renderPlantUmlDiagrams,
  type PlantUmlRenderResult,
} from "./plantUmlRenderer";
import type { PlantUmlEngine } from "../configuration/plantUmlConfiguration";
import { enabledMystExtensionsFor } from "../myst/confLocator";
import { createPreviewResourcePolicy, readBoundedText } from "../security/resource-policy";

export interface PreviewDocument {
  uri: { scheme: string; fsPath: string };
  languageId: string;
  version?: number;
  getText(): string;
}

export interface PreviewDiagnostic extends RenderDiagnostic {
  code: string;
  file?: string;
  column?: number;
  value?: string;
}

/**
 * Describes the document a rendered result belongs to.
 *
 * Kept as a distinct object because scroll-sync messages are matched against the exact
 * document identity, version, and request that produced the HTML currently on screen.
 */
export interface RenderStage {
  activeDocumentPath: string;
  activeDocumentIdentity: string;
  activeDocumentVersion: number;
  requestId: number;
  /** Base directory for resolving relative assets; the document's own folder. */
  outputDirectory: string;
  /** Buffer text at render time, reused by frontmatter analysis. */
  sourceText: string;
  dependencies: readonly string[];
  sourceOrigins: ReadonlyMap<string, string>;
  diagnostics: PreviewDiagnostic[];
  dispose(): void;
}

export interface RenderResult {
  stage: RenderStage;
  html: string;
  resolvePlantUml: () => Promise<PlantUmlRenderResult>;
  /** The engine this render was made for: `builtin` pages load the bundled engine. */
  plantUmlEngine: PlantUmlEngine;
  diagnostics: PreviewDiagnostic[];
  latencyMs: number;
}

export interface RenderOptions {
  document: PreviewDocument;
  workspaceRoot: string;
  requestId: number;
  documentIdentity?: string;
  signal?: AbortSignal;
  isWorkspaceTrusted: () => boolean;
  allowUntrusted?: boolean;
  plantUmlJarPath?: string;
  /**
   * `builtin`: the diagrams stay placeholders for the engine bundled into the webview, and
   * `resolvePlantUml` reports nothing (no process, no file read). `jar`: the host renders them
   * through `plantUmlJarPath` or `plantuml` on PATH, in a trusted workspace only. Omitted: `jar`,
   * the behaviour of callers that predate the built-in engine; the extension always passes it.
   */
  plantUmlEngine?: PlantUmlEngine;
}

export class WorkspaceTrustError extends Error {
  public constructor() {
    super("The MyST preview is disabled until the workspace is trusted.");
    this.name = "WorkspaceTrustError";
  }
}

export class RenderCanceledError extends Error {
  public constructor() {
    super("The MyST render was canceled because a newer edit arrived.");
    this.name = "RenderCanceledError";
  }
}

export class RenderError extends Error {
  public readonly diagnostics: PreviewDiagnostic[];
  public readonly stage: RenderStage;

  public constructor(message: string, stage: RenderStage, diagnostics: PreviewDiagnostic[]) {
    super(message);
    this.name = "RenderError";
    this.stage = stage;
    this.diagnostics = diagnostics;
  }
}

export type RenderOverride = (source: string) => Promise<{ html: string; diagnostics?: PreviewDiagnostic[] }>;

let renderOverride: RenderOverride | undefined;
let testDelayMs = 0;

export function setRenderOverrideForTests(override: RenderOverride | undefined): void {
  renderOverride = override;
}

export function setRenderDelayForTests(delayMs: number): void {
  testDelayMs = Math.max(0, delayMs);
}

export function resetRenderHooksForTests(): void {
  renderOverride = undefined;
  testDelayMs = 0;
}

function createStage(options: RenderOptions, diagnostics: PreviewDiagnostic[]): RenderStage {
  const documentPath = path.resolve(options.document.uri.fsPath);
  return {
    activeDocumentPath: documentPath,
    activeDocumentIdentity: options.documentIdentity ?? documentPath,
    activeDocumentVersion: options.document.version ?? 0,
    requestId: options.requestId,
    outputDirectory: path.dirname(documentPath),
    sourceText: options.document.getText(),
    dependencies: [],
    sourceOrigins: new Map([[documentPath, documentPath]]),
    diagnostics,
    // Nothing is written to disk, so there is nothing to clean up.
    dispose: () => undefined,
  };
}

/**
 * Renders the active document to HTML in-process.
 *
 * No workspace staging, no subprocess, and no temporary files: the buffer text is the
 * only input, which is what lets the preview keep up with typing.
 */
export async function renderPreviewDocument(options: RenderOptions): Promise<RenderResult> {
  if (!options.allowUntrusted && !options.isWorkspaceTrusted()) {
    throw new WorkspaceTrustError();
  }
  const started = performance.now();
  const diagnostics: PreviewDiagnostic[] = [];
  const deferredController = new AbortController();
  const abortDeferred = (): void => deferredController.abort();
  options.signal?.addEventListener("abort", abortDeferred, { once: true });
  const stage = createStage(options, diagnostics);
  const originalDispose = stage.dispose;
  stage.dispose = (): void => {
    deferredController.abort();
    options.signal?.removeEventListener("abort", abortDeferred);
    originalDispose();
  };
  const resourcePolicy = createPreviewResourcePolicy(
    path.dirname(stage.activeDocumentPath),
    options.workspaceRoot,
  );

  let html: string;
  let resolvePlantUml: () => Promise<PlantUmlRenderResult> = () => Promise.resolve({
    diagrams: [],
    diagnostics: [],
  });
  try {
    const rendered = renderOverride
      ? await renderOverride(options.document.getText())
      : await renderMyst(options.document.getText(), {
        sourcePath: stage.activeDocumentPath,
        enabledMystExtensions: enabledMystExtensionsFor(stage.activeDocumentPath, options.workspaceRoot),
        resolveInclude: (request, sourcePath) => {
          const read = readBoundedText(resourcePolicy, request, path.dirname(sourcePath));
          return read.ok ? { path: read.path, source: read.source } : undefined;
        },
        // `{uml} file.puml`: the same read as `{include}`, with the reason of a refusal.
        readDiagramFile: (request, sourcePath) => readBoundedText(resourcePolicy, request, path.dirname(sourcePath)),
        listDocuments: (pattern, sourcePath) => listGlobDocuments(
          pattern,
          path.dirname(sourcePath),
          (candidate) => resourcePolicy.resolveResource(candidate, path.dirname(sourcePath)) !== undefined,
          sourcePath,
        ),
      });
    html = rendered.html;
    if (!renderOverride && "dependencies" in rendered) {
      stage.dependencies = rendered.dependencies;
      for (const securityDiagnostic of resourcePolicy.diagnostics) {
        diagnostics.push({
          message: securityDiagnostic.message,
          severity: "warning",
          code: securityDiagnostic.code,
          file: stage.activeDocumentPath,
          value: securityDiagnostic.value,
        });
      }
    }
    for (const diagnostic of rendered.diagnostics ?? []) {
      diagnostics.push({ ...diagnostic, code: diagnostic.code === "myst-extension" ? diagnostic.code : "myst-diagnostic", file: stage.activeDocumentPath });
    }
    if (!renderOverride && options.plantUmlEngine !== "builtin") {
      let plantUmlPromise: Promise<PlantUmlRenderResult> | undefined;
      resolvePlantUml = (): Promise<PlantUmlRenderResult> => {
        plantUmlPromise ??= renderPlantUmlDiagrams(html, {
          jarPath: options.plantUmlJarPath,
          workspaceRoot: options.workspaceRoot,
          trusted: options.isWorkspaceTrusted(),
          signal: deferredController.signal,
        }).catch((error: unknown) => ({
          diagrams: [],
          diagnostics: [{
            message: error instanceof Error ? error.message : String(error),
            severity: "warning" as const,
          }],
        }));
        return plantUmlPromise;
      };
    }
  } catch (error) {
    throw new RenderError(
      error instanceof Error ? error.message : String(error),
      stage,
      diagnostics,
    );
  }

  if (testDelayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, testDelayMs));
  }

  if (options.signal?.aborted) {
    throw new RenderCanceledError();
  }

  return {
    stage,
    html,
    resolvePlantUml,
    plantUmlEngine: options.plantUmlEngine ?? "jar",
    diagnostics,
    latencyMs: performance.now() - started,
  };
}
