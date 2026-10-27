/**
 * Local files of PlantUML diagrams, read by the extension host for the built-in engine: the
 * `!include` family asked for by the webview (`previewPlantUmlInclude`) and the diagram file of
 * `{uml} path.puml`. Both use the rules of `{include}`: a relative path, inside the document's
 * folder or the workspace (only the document's folder and below in Restricted Mode), no symlink
 * escape, at most 5 MiB. URLs and the standard library (`<C4/...>`) are never read.
 *
 * It also checks the includes of a diagram sent to the PlantUML JAR (`findEscapingPlantUmlInclude`),
 * because the JAR's own ALLOWLIST check still reads a path that climbs out of the workspace through
 * parent segments and an absolute path into a sibling folder sharing the folder-name prefix.
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
  /** A read-only preview: the include policy is narrowed (TRUST-002). */
  readOnly?: boolean;
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
    scope.readOnly === true || !scope.trusted,
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

const MAX_JAR_INCLUDE_DEPTH = 8;
const MAX_JAR_INCLUDED_FILES = 64;
const JAR_INCLUDE_LINE = /^\s*!(?:include(?:_many|_once|sub)?|import)\s+(.+?)\s*$/iu;
const URL_PREFIX = /^[a-z][a-z\d+.-]+:\/\//iu;

/** The file part of an include argument: quotes and the `!SUB` / `#id` selector removed. */
function includeFile(argument: string): string {
  let value = argument.trim();
  if (value.length >= 2 && /^["'].*["']$/u.test(value)) {
    value = value.slice(1, -1);
  }
  const selector = value.search(/[!#]/u);
  return selector > 0 ? value.slice(0, selector) : value;
}

// @implements_req SwRS-MDOKFSTUDIO-DIAG-084
/**
 * The refusal message when an include of a diagram source for the PlantUML JAR (or of a file it
 * includes) leaves `workspaceRoot`, or is computed (`%function()`, `$variable`) and so cannot be
 * checked; undefined when every include stays inside. Containment is decided on path segments
 * after the real path (never a string prefix). URLs and `<standard library>` names are not files
 * and are left to the JAR.
 */
export function findEscapingPlantUmlInclude(
  source: string,
  workspaceRoot: string,
): string | undefined {
  const root = path.resolve(workspaceRoot);
  const policy = createPreviewResourcePolicy(root);
  const visited = new Set<string>();
  const outside = (name: string): string =>
    `PlantUML include "${name}" is outside the workspace folder and was not read.`;

  const check = (text: string, baseDirectory: string, depth: number): string | undefined => {
    for (const line of text.split(/\r?\n/u)) {
      const argument = JAR_INCLUDE_LINE.exec(line)?.[1];
      if (argument === undefined) {
        continue;
      }
      const name = includeFile(argument);
      if (!name || name.startsWith("<") || URL_PREFIX.test(name)) {
        continue;
      }
      if (/[%$]/u.test(name)) {
        return `PlantUML include "${name}" is computed and cannot be checked; `
          + "write the path out so it can be confirmed to stay inside the workspace.";
      }
      // An absolute path is judged by its segments below the root, then read like a relative one.
      let requests: Array<{ request: string; base: string }>;
      if (path.isAbsolute(name)) {
        const relative = path.relative(root, path.resolve(name));
        if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
          return outside(name);
        }
        requests = [{ request: relative.split(path.sep).join("/"), base: root }];
      } else {
        // PlantUML looks a relative path up from the working directory (the root) and from the
        // including file; both must stay inside.
        requests = [{ request: name, base: root }, { request: name, base: baseDirectory }];
      }
      for (const { request, base } of requests) {
        const read = readBoundedText(policy, request, base);
        if (read.ok) {
          if (!visited.has(read.path) && visited.size < MAX_JAR_INCLUDED_FILES && depth < MAX_JAR_INCLUDE_DEPTH) {
            visited.add(read.path);
            const refusal = check(read.source, path.dirname(read.path), depth + 1);
            if (refusal) {
              return refusal;
            }
          }
        } else if (
          read.refusal === "resource-outside-root"
          || read.refusal === "symlink-escape"
          || read.refusal === "invalid-resource-path"
          || read.refusal === "blocked-resource-scheme"
        ) {
          return outside(name);
        }
        // Missing, too large or unreadable: left to the JAR to report.
      }
    }
    return undefined;
  };

  return check(source, root, 0);
}
