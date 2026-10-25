/**
 * Local files of PlantUML diagrams, read by the extension host for the built-in engine: the
 * `!include` family asked for by the webview (`previewPlantUmlInclude`) and the diagram file of
 * `{uml} path.puml`. Both use the rules of `{include}`: a relative path, inside the document's
 * folder or the workspace (only the document's folder and below in Restricted Mode), no symlink
 * escape, at most 5 MiB. URLs and the standard library (`<C4/...>`) are never read.
 *
 * This module must not import `vscode`.
 */
import * as path from "node:path";

import {
  type BoundedTextRead,
  createPreviewResourcePolicy,
  MAX_INCLUDED_FILE_BYTES,
  readBoundedText,
} from "../security/resource-policy";

type Refusal = Exclude<BoundedTextRead, { ok: true }>["refusal"];

const MAX_FILE_MIB = Math.round(MAX_INCLUDED_FILE_BYTES / (1024 * 1024));

/** Why a local PlantUML file is not read, for the preview message. */
export function describePlantUmlFileRefusal(request: string, refusal: Refusal): string {
  switch (refusal) {
    case "missing-resource":
      return `PlantUML file not found: ${request}.`;
    case "resource-outside-root":
    case "symlink-escape":
      return `PlantUML file ${request} is outside the folders the preview reads `
        + "(the workspace, or only the document's folder in Restricted Mode).";
    case "blocked-resource-scheme":
      return `PlantUML file ${request} must be a relative path to a local file.`;
    case "too-large":
      return `PlantUML file ${request} is larger than the ${MAX_FILE_MIB} MiB preview limit.`;
    default:
      return `PlantUML file ${request} could not be read.`;
  }
}

export interface PlantUmlIncludeRequest {
  /** The file the directive names, as the engine passes it (variables expanded, selector removed). */
  path: string;
  /**
   * The id (absolute path) this host gave the including file, or null for a diagram of the
   * previewed document itself.
   */
  from: string | null;
}

export interface PlantUmlIncludeScope {
  /** The previewed document. */
  documentPath: string;
  /** The workspace folder of the preview; ignored in Restricted Mode. */
  workspaceRoot?: string;
  trusted: boolean;
}

export type PlantUmlIncludeAnswer =
  | { ok: true; id: string; text: string; watch: string }
  | { ok: false; reason: string; watch?: string };

/** A URL or a standard-library name (`<C4/C4_Context>`): never read from the disk. */
const NOT_LOCAL = /^\s*(?:<|[a-z][a-z\d+.-]*:)/iu;

// @implements_req SwRS-MDOKFSTUDIO-DIAG-054
/**
 * Reads the file a PlantUML `!include` asks for. A nested include resolves next to the including
 * file (`from`), a top-level one next to the document. `watch` is the path whose change (or
 * creation, for a missing file inside the roots) must draw the diagram again.
 */
export function resolvePlantUmlInclude(
  request: PlantUmlIncludeRequest,
  scope: PlantUmlIncludeScope,
): PlantUmlIncludeAnswer {
  const name = request.path.trim();
  if (!name) {
    return { ok: false, reason: "The include names no file." };
  }
  if (NOT_LOCAL.test(name)) {
    return {
      ok: false,
      reason: `${name} is not a local file: the built-in PlantUML engine reads no URL and no standard library.`,
    };
  }
  if (request.from !== null && !path.isAbsolute(request.from)) {
    return { ok: false, reason: `PlantUML file ${name} could not be read.` };
  }
  const documentDirectory = path.dirname(path.resolve(scope.documentPath));
  // Restricted Mode: the document's folder and below only, whatever the workspace is.
  const policy = createPreviewResourcePolicy(
    documentDirectory,
    scope.trusted ? scope.workspaceRoot : undefined,
  );
  const baseDirectory = request.from === null ? documentDirectory : path.dirname(request.from);
  const read = readBoundedText(policy, name, baseDirectory);
  if (!read.ok) {
    return {
      ok: false,
      reason: describePlantUmlFileRefusal(name, read.refusal),
      ...(read.candidate ? { watch: read.candidate } : {}),
    };
  }
  return { ok: true, id: read.path, text: read.source, watch: read.path };
}

// @implements_req SwRS-MDOKFSTUDIO-DIAG-053
/** The files the built-in engine was given (or asked for in vain), to draw again when they change. */
export class PlantUmlIncludeWatch {
  private readonly paths = new Set<string>();

  public constructor(private readonly limit = 1024) {}

  public remember(filePath: string): void {
    this.paths.delete(filePath);
    this.paths.add(filePath);
    while (this.paths.size > this.limit) {
      this.paths.delete(this.paths.values().next().value as string);
    }
  }

  public has(filePath: string): boolean {
    return this.paths.has(filePath);
  }

  public clear(): void {
    this.paths.clear();
  }

  public get size(): number {
    return this.paths.size;
  }
}
