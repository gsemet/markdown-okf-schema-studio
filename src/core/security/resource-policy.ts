import * as fs from "node:fs";
import * as path from "node:path";

export interface ResourceRoot {
  label: string;
  directory: string;
}

export interface SecurityDiagnostic {
  code: string;
  message: string;
  value?: string;
}

export type ResourceRefusalCode =
  | "invalid-resource-path"
  | "blocked-resource-scheme"
  | "resource-outside-root"
  | "missing-resource"
  | "symlink-escape"
  | "restricted-root"
  | "hidden-path";

export type ResourceResolution =
  | { path: string }
  | { refusal: ResourceRefusalCode; candidate?: string };

/** Largest file `{include}`, `{uml}` and a PlantUML `!include` read for the preview. */
export const MAX_INCLUDED_FILE_BYTES = 5 * 1024 * 1024;

export type BoundedTextRead =
  | { ok: true; path: string; source: string }
  | { ok: false; refusal: ResourceRefusalCode | "too-large" | "unreadable"; candidate?: string };

export type NavigationResult =
  | { kind: "anchor"; value: string }
  | { kind: "external"; value: string }
  | { kind: "local"; path: string; suffix: string }
  | { kind: "blocked" };

interface CanonicalRoot {
  label: string;
  directory: string;
  realDirectory: string;
}

const SCHEME_PATTERN = /^[a-z][a-z\d+.-]*:/i;
const EXTERNAL_SCHEMES = new Set(["http:", "https:", "mailto:"]);
const ANCHOR_PATTERN = /^#[a-z\d][a-z\d_.:-]*$/i;

interface ParsedReference {
  path: string;
  suffix: string;
}

function splitReference(value: string): ParsedReference {
  const fragmentIndex = value.indexOf("#");
  const pathAndQueryEnd = fragmentIndex === -1 ? value.length : fragmentIndex;
  const queryIndex = value.slice(0, pathAndQueryEnd).indexOf("?");
  const pathEnd = queryIndex === -1 ? pathAndQueryEnd : queryIndex;
  return {
    path: value.slice(0, pathEnd),
    suffix: value.slice(pathEnd),
  };
}

export function resourcePathPart(value: string): string {
  return splitReference(value.trim()).path;
}

export function resourceReferenceSuffix(value: string): string {
  return splitReference(value.trim()).suffix;
}

function isWithin(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function decodePath(value: string): string | undefined {
  let decoded = value;
  try {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) {
        return decoded;
      }
      decoded = next;
    }
  } catch {
    return undefined;
  }
  return /%[\da-f]{2}/i.test(decoded) ? undefined : decoded;
}

function schemeOf(value: string): string | undefined {
  const match = value.match(SCHEME_PATTERN);
  return match?.[0].toLowerCase();
}

function diagnostic(
  diagnostics: SecurityDiagnostic[],
  code: string,
  message: string,
  value?: string,
): void {
  diagnostics.push({ code, message, value });
}

function realOrResolved(directory: string): string {
  try {
    return fs.realpathSync(path.resolve(directory));
  } catch {
    return path.resolve(directory);
  }
}

/**
 * The home folder the way `os.homedir()` finds it (the core layer does not import `node:os`):
 * USERPROFILE first on Windows (HOME can differ under Git Bash), HOME first elsewhere.
 */
function homeFolder(): string | undefined {
  const { HOME, USERPROFILE, HOMEDRIVE, HOMEPATH } = process.env;
  const drivePath = HOMEDRIVE && HOMEPATH ? `${HOMEDRIVE}${HOMEPATH}` : undefined;
  return process.platform === "win32"
    ? USERPROFILE || HOME || drivePath
    : HOME || USERPROFILE || drivePath;
}

/** Windows and macOS file systems are case-insensitive by default; `realpath` keeps the input case. */
function foldCase(value: string): string {
  return process.platform === "win32" || process.platform === "darwin" ? value.toLowerCase() : value;
}

// @implements_req SwRS-MDOKFSTUDIO-TRUST-002
/**
 * True when `directory` is too broad to serve as the resource root of a read-only preview: the
 * user's home folder, a folder that contains it (`/Users`, `C:\Users`), a file-system root or a
 * drive root. Symbolic links are resolved first.
 */
export function isBroadReadOnlyRoot(directory: string): boolean {
  const real = realOrResolved(directory);
  if (path.parse(real).root === real) {
    return true;
  }
  const home = homeFolder();
  return home !== undefined && isWithin(foldCase(real), foldCase(realOrResolved(home)));
}

// @implements_req SwRS-MDOKFSTUDIO-MYST-031
// @implements_req SwRS-MDOKFSTUDIO-TRUST-002
/**
 * The policy of one preview. `readOnly` (no workspace folder, or Restricted Mode) narrows it: a
 * broad document folder (see {@link isBroadReadOnlyRoot}) serves no resource at all, and a path
 * with a dot-segment below the root (`.ssh`, `.aws`, `.config`) is refused.
 */
export function createPreviewResourcePolicy(
  documentDirectory: string,
  workspaceRoot?: string,
  readOnly = false,
): ResourcePolicy {
  const roots: ResourceRoot[] = [
    { label: "preview document directory", directory: documentDirectory },
    ...(workspaceRoot ? [{ label: "workspace root", directory: workspaceRoot }] : []),
  ];
  return new ResourcePolicy(roots, readOnly ? { readOnly: true } : {});
}

const MAX_FILE_FACTS = 2000;

export interface ResourcePolicyOptions {
  /** Read-only preview: broad roots serve nothing and dot-segments are refused. */
  readOnly?: boolean;
}

export class ResourcePolicy {
  public readonly diagnostics: SecurityDiagnostic[] = [];

  private readonly roots: CanonicalRoot[];

  private readonly readOnly: boolean;

  // One policy serves one render. The file-system answer for a path (its real path, or that it is
  // no regular file) is asked once per render: a page that references the same image or include
  // many times stats it once. Bounded; a render that outgrows it starts a fresh memo.
  private readonly fileFacts = new Map<string, string | null>();

  public constructor(roots: readonly ResourceRoot[], options: ResourcePolicyOptions = {}) {
    this.readOnly = options.readOnly === true;
    this.roots = roots.flatMap((root) => {
      try {
        const directory = path.resolve(root.directory);
        const realDirectory = fs.realpathSync(directory);
        return [{ label: root.label, directory, realDirectory }];
      } catch {
        diagnostic(
          this.diagnostics,
          "missing-root",
          `The ${root.label} resource root is unavailable.`,
          root.directory,
        );
        return [];
      }
    });
  }

  /** The real path of `candidate` when it is a regular file, else null; memoized per render. */
  private realFile(candidate: string): string | null {
    const memo = this.fileFacts.get(candidate);
    if (memo !== undefined) return memo;
    let real: string | null;
    try {
      if (!fs.statSync(candidate).isFile()) {
        throw new Error("resource is not a file");
      }
      real = fs.realpathSync(candidate);
    } catch {
      real = null;
    }
    if (this.fileFacts.size >= MAX_FILE_FACTS) this.fileFacts.clear();
    this.fileFacts.set(candidate, real);
    return real;
  }

  public resolveResource(request: string, baseDirectory: string): string | undefined {
    const resolution = this.resolveResourceDetailed(request, baseDirectory);
    return "path" in resolution ? resolution.path : undefined;
  }

  // @implements_req SwRS-MDOKFSTUDIO-CORE-013
  // @implements_req SwRS-MDOKFSTUDIO-TRUST-025
  /**
   * `resolveResource` with the reason of a refusal (the diagnostic code it records), and for a
   * missing file inside the roots the absolute path it would have, so a caller can watch for it.
   */
  public resolveResourceDetailed(request: string, baseDirectory: string): ResourceResolution {
    const decoded = decodePath(resourcePathPart(request));
    if (!decoded || decoded.includes("\0") || decoded.includes("\\")) {
      diagnostic(
        this.diagnostics,
        "invalid-resource-path",
        "The resource path could not be decoded safely.",
        request,
      );
      return { refusal: "invalid-resource-path" };
    }

    if (
      decoded.startsWith("/") ||
      decoded.startsWith("//") ||
      schemeOf(decoded) !== undefined
    ) {
      diagnostic(
        this.diagnostics,
        "blocked-resource-scheme",
        "Only relative resources inside the staged roots are allowed.",
        request,
      );
      return { refusal: "blocked-resource-scheme" };
    }

    const candidate = path.resolve(baseDirectory, decoded);
    const root = this.roots.find((entry) => isWithin(entry.directory, candidate));
    if (!root) {
      diagnostic(
        this.diagnostics,
        "resource-outside-root",
        "The resource is outside the staged preview roots.",
        request,
      );
      return { refusal: "resource-outside-root" };
    }

    if (this.readOnly) {
      if (isBroadReadOnlyRoot(root.directory)) {
        diagnostic(
          this.diagnostics,
          "restricted-root",
          "This read-only preview is in your home folder or a file-system root, so it reads no "
          + "include or resource; open a folder in the workspace to include files.",
          request,
        );
        return { refusal: "restricted-root" };
      }
      const hidden = path.relative(root.directory, candidate).split(path.sep)
        .some((segment) => segment.startsWith("."));
      if (hidden) {
        diagnostic(
          this.diagnostics,
          "hidden-path",
          "A read-only preview does not read paths inside dot-directories such as .ssh or .config.",
          request,
        );
        return { refusal: "hidden-path" };
      }
    }

    const known = this.realFile(candidate);
    if (known === null) {
      diagnostic(
        this.diagnostics,
        "missing-resource",
        "The staged resource does not exist or is not a regular file.",
        request,
      );
      return { refusal: "missing-resource", candidate };
    }
    const realCandidate = known;

    if (
      this.readOnly
      && path.relative(root.realDirectory, realCandidate).split(path.sep)
        .some((segment) => segment.startsWith("."))
    ) {
      diagnostic(
        this.diagnostics,
        "hidden-path",
        "A read-only preview does not read paths inside dot-directories such as .ssh or .config.",
        request,
      );
      return { refusal: "hidden-path" };
    }

    if (!isWithin(root.realDirectory, realCandidate)) {
      diagnostic(
        this.diagnostics,
        "symlink-escape",
        `The resource escapes the ${root.label} root through a symlink.`,
        request,
      );
      return { refusal: "symlink-escape" };
    }

    return { path: realCandidate };
  }

  // @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-090
  public resolveNavigation(request: string, baseDirectory: string): NavigationResult {
    const trimmed = request.trim();
    if (trimmed.startsWith("#")) {
      return ANCHOR_PATTERN.test(trimmed)
        ? { kind: "anchor", value: trimmed }
        : { kind: "blocked" };
    }
    const decoded = decodePath(resourcePathPart(trimmed));
    if (!decoded) {
      diagnostic(
        this.diagnostics,
        "invalid-navigation",
        "The navigation target could not be decoded safely.",
        request,
      );
      return { kind: "blocked" };
    }

    // The scheme is read on the raw string, because the raw string is what is opened: a `%` before
    // the first `:` hides the scheme from the opener, and the link is never external.
    const rawScheme = schemeOf(trimmed);
    const scheme = rawScheme ?? schemeOf(decoded);
    if (scheme) {
      if (rawScheme !== undefined && EXTERNAL_SCHEMES.has(rawScheme)) {
        return { kind: "external", value: trimmed };
      }
      diagnostic(
        this.diagnostics,
        "blocked-navigation-scheme",
        "The navigation scheme is not allowed in the preview.",
        request,
      );
      return { kind: "blocked" };
    }

    const localPath = this.resolveResource(decoded, baseDirectory);
    return localPath
      ? { kind: "local", path: localPath, suffix: resourceReferenceSuffix(trimmed) }
      : { kind: "blocked" };
  }
}

 function relativeResourcePath(fromDirectory: string, resourcePath: string): string {
  const relative = path.relative(fromDirectory, resourcePath);
  return relative.split(path.sep).join("/");
}

export function rewriteSrcset(
  value: string,
  resolve: (request: string) => string | undefined,
): string | undefined {
  const candidates = value
    .split(",")
    .map((candidate) => candidate.trim())
    .filter(Boolean);
  const rewritten = candidates.flatMap((candidate) => {
    const [request, ...descriptor] = candidate.split(/\s+/u);
    const safeRequest = resolve(request);
    return safeRequest ? [`${safeRequest}${descriptor.length ? ` ${descriptor.join(" ")}` : ""}`] : [];
  });
  return rewritten.length > 0 ? rewritten.join(", ") : undefined;
}

/**
 * Reads a text file the way `{include}` does: through `policy` (relative path, inside the roots,
 * no symlink escape), a regular file of at most `maxBytes`, as UTF-8.
 */
export function readBoundedText(
  policy: ResourcePolicy,
  request: string,
  baseDirectory: string,
  maxBytes = MAX_INCLUDED_FILE_BYTES,
): BoundedTextRead {
  const resolution = policy.resolveResourceDetailed(request, baseDirectory);
  if (!("path" in resolution)) {
    return { ok: false, refusal: resolution.refusal, ...(resolution.candidate ? { candidate: resolution.candidate } : {}) };
  }
  try {
    if (fs.statSync(resolution.path).size > maxBytes) {
      return { ok: false, refusal: "too-large" };
    }
    return { ok: true, path: resolution.path, source: fs.readFileSync(resolution.path, "utf8") };
  } catch {
    return { ok: false, refusal: "unreadable" };
  }
}
