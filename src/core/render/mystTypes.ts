/**
 * The public types of the MyST renderer: its context (includes, diagrams, globs), result and
 * diagnostics.
 */

import type { BoundedTextRead } from "../security/resource-policy";

/** A problem the renderer reports for the preview's diagnostics. */
export interface RenderDiagnostic {
  /** Set for MyST extension warnings; every other diagnostic gets the pipeline's default code. */
  code?: string;
  message: string;
  line?: number;
  severity: "warning" | "error";
}

/**
 * The rendered HTML, the diagnostics, and the files the render read (to re-render when they
 * change).
 */
export interface MystRenderResult {
  html: string;
  diagnostics: RenderDiagnostic[];
  dependencies: string[];
}

/** A file an `{include}` read: its path and text. */
export interface MystIncludeSource {
  path: string;
  source: string;
}

/** What a render may read besides the document: included files, diagram files, toctree globs. */
export interface MystRenderContext {
  sourcePath?: string;
  resolveInclude: (request: string, sourcePath: string) => MystIncludeSource | undefined;
  /**
   * Reads the diagram file of `{uml} path.puml` (and of `{plantuml} path.puml` without a body)
   * under the rules of `{include}`, with the reason of a refusal. Unset: `resolveInclude` is used
   * and every refusal reads as a missing file.
   */
  readDiagramFile?: (request: string, sourcePath: string) => BoundedTextRead;
  /**
   * Lists the documents a `{toctree}` glob entry matches, as requests relative to the source
   * document's folder (any order). Unset: glob entries show as missing.
   */
  listDocuments?: (pattern: string, sourcePath: string) => string[];
  /**
   * MyST extensions the document's Sphinx project enables, when that is known for certain.
   * Set: syntax that needs a missing extension is reported as a warning (rendering is unchanged).
   * Unset: no check.
   */
  enabledMystExtensions?: ReadonlySet<string>;
}
