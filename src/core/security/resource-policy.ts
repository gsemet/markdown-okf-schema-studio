import * as path from "../path/hostPath";

import type { FileSystem } from "../files/fileSystem";

/** What the resource policy asks of the file system: real paths, regular-file checks and reads. */
export type PolicyFiles = Pick<FileSystem, "realpath" | "stat" | "readFile">;

export interface ResourceRoot {
  label: string;
  directory: string;
  /** The folder of the previewed document: a preview with restricted reads serves its images even when it is broad. */
  documentFolder?: boolean;
}

/** The image formats a preview with restricted reads shows from the workspace root (`<img>` sources). */
const IMAGE_EXTENSIONS = /\.(?:png|jpe?g|gif|webp|svg)$/iu;

export interface ResourceRequestOptions {
  /** The request names an image file (by extension): a preview with restricted reads then reaches the workspace root too. */
  image?: boolean;
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
  documentFolder: boolean;
  /** Too broad to serve a preview with restricted reads (see {@link isBroadRestrictedRoot}); set only with `restrictedReads`. */
  broad: boolean;
}

/** A resource request the sanitizer asked for before its answer was known (see {@link ResourcePolicy.prime}). */
export interface ResourceRequest {
  request: string;
  baseDirectory: string;
  options?: ResourceRequestOptions;
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

async function realOrResolved(files: Pick<FileSystem, "realpath">, directory: string): Promise<string> {
  try {
    return await files.realpath(path.resolve(directory));
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
 * True when `directory` is too broad to serve as the resource root of a preview with restricted reads: the
 * user's home folder, a folder that contains it (`/Users`, `C:\Users`), a file-system root or a
 * drive root. Symbolic links are resolved first.
 */
export async function isBroadRestrictedRoot(
  files: Pick<FileSystem, "realpath">,
  directory: string,
): Promise<boolean> {
  const real = await realOrResolved(files, directory);
  if (path.parse(real).root === real) {
    return true;
  }
  const home = homeFolder();
  return home !== undefined && isWithin(foldCase(real), foldCase(await realOrResolved(files, home)));
}

// @implements_req SwRS-MDOKFSTUDIO-MYST-031
// @implements_req SwRS-MDOKFSTUDIO-TRUST-002
// @implements_req SwRS-MDOKFSTUDIO-TRUST-091
/**
 * The policy of one preview. `restrictedReads` (no workspace folder, or Restricted Mode) narrows it: an
 * include or other resource comes from the document folder only and never from a broad one (see
 * {@link isBroadRestrictedRoot}); an image (png, jpg, jpeg, gif, webp, svg) also comes from the
 * workspace root unless that is broad, and from a broad document folder; a path with a
 * dot-segment below the root (`.ssh`, `.aws`, `.config`) is always refused.
 */
export function createPreviewResourcePolicy(
  files: PolicyFiles,
  documentDirectory: string,
  workspaceRoot?: string,
  restrictedReads = false,
): ResourcePolicy {
  const roots: ResourceRoot[] = [
    { label: "preview document directory", directory: documentDirectory, documentFolder: true },
    ...(workspaceRoot ? [{ label: "workspace root", directory: workspaceRoot }] : []),
  ];
  return new ResourcePolicy(files, roots, restrictedReads ? { restrictedReads: true } : {});
}

const MAX_FILE_FACTS = 2000;

export interface ResourcePolicyOptions {
  /** Restricted reads: broad roots serve no include, images come from the document and workspace folders, dot-segments are refused. */
  restrictedReads?: boolean;
}

export class ResourcePolicy {
  public readonly diagnostics: SecurityDiagnostic[] = [];

  private roots: CanonicalRoot[] = [];

  private opening: Promise<void> | undefined;

  // True once the roots are canonicalized: before, the synchronous decision has no root to compare with.
  private opened = false;

  private readonly restrictedReads: boolean;

  // One policy serves one render. The file-system answer for a path (its real path, or that it is
  // no regular file) is asked once per render: a page that references the same image or include
  // many times stats it once. Bounded; a render that outgrows it starts a fresh memo. The decision
  // itself is synchronous and reads only this memo: `prime` (or an async resolve) fills it first.
  private readonly fileFacts = new Map<string, string | null>();

  private unprimed: ResourceRequest[] = [];

  public constructor(
    public readonly files: PolicyFiles,
    private readonly rootRequests: readonly ResourceRoot[],
    options: ResourcePolicyOptions = {},
  ) {
    this.restrictedReads = options.restrictedReads === true;
  }

  /** Canonicalizes the roots once (their real paths); a root that cannot be resolved is reported and dropped. */
  private open(): Promise<void> {
    this.opening ??= (async (): Promise<void> => {
      const roots: CanonicalRoot[] = [];
      for (const root of this.rootRequests) {
        try {
          const directory = path.resolve(root.directory);
          const realDirectory = await this.files.realpath(directory);
          const broad = this.restrictedReads && await isBroadRestrictedRoot(this.files, directory);
          roots.push({ label: root.label, directory, realDirectory, documentFolder: root.documentFolder === true, broad });
        } catch {
          diagnostic(
            this.diagnostics,
            "missing-root",
            `The ${root.label} resource root is unavailable.`,
            root.directory,
          );
        }
      }
      this.roots = roots;
      this.opened = true;
    })();
    return this.opening;
  }

  /** The real path of `candidate` when it is a regular file, else null; memoized per render. */
  private async realFile(candidate: string): Promise<string | null> {
    const memo = this.fileFacts.get(candidate);
    if (memo !== undefined) return memo;
    let real: string | null;
    try {
      if ((await this.files.stat(candidate)).kind !== "file") {
        throw new Error("resource is not a file");
      }
      real = await this.files.realpath(candidate);
    } catch {
      real = null;
    }
    if (this.fileFacts.size >= MAX_FILE_FACTS) this.fileFacts.clear();
    this.fileFacts.set(candidate, real);
    return real;
  }

  /**
   * Asks the file system about every request that reaches a file check, so the synchronous
   * {@link resolvePrimed} answers from the memo. A request that is refused earlier needs no lookup.
   */
  public async prime(requests: readonly ResourceRequest[]): Promise<void> {
    await this.open();
    for (const entry of requests) {
      const outcome = this.evaluate(entry.request, entry.baseDirectory, entry.options ?? {}, true);
      if ("need" in outcome) await this.realFile(outcome.need);
    }
  }

  /** The requests {@link resolvePrimed} could not answer from the memo since the last call; the list is emptied. */
  public takeUnprimed(): ResourceRequest[] {
    const taken = this.unprimed;
    this.unprimed = [];
    return taken;
  }

  /**
   * The synchronous decision, for a caller that cannot wait (the HTML sanitizer): it answers from
   * the memo that {@link prime} filled. A request whose file facts are not known is refused as
   * missing and listed in {@link takeUnprimed}; the file system is never read here.
   */
  public resolvePrimed(
    request: string,
    baseDirectory: string,
    options: ResourceRequestOptions = {},
  ): string | undefined {
    if (!this.opened) {
      // A caller that forgot to prime: list the request instead of refusing it as outside every root.
      this.unprimed.push({ request, baseDirectory, options });
      return undefined;
    }
    const outcome = this.evaluate(request, baseDirectory, options, false);
    if ("need" in outcome) {
      this.unprimed.push({ request, baseDirectory, options });
      return undefined;
    }
    return "path" in outcome ? outcome.path : undefined;
  }

  public async resolveResource(
    request: string,
    baseDirectory: string,
    options?: ResourceRequestOptions,
  ): Promise<string | undefined> {
    const resolution = await this.resolveResourceDetailed(request, baseDirectory, options);
    return "path" in resolution ? resolution.path : undefined;
  }

  // @implements_req SwRS-MDOKFSTUDIO-CORE-013
  // @implements_req SwRS-MDOKFSTUDIO-TRUST-025
  /**
   * `resolveResource` with the reason of a refusal (the diagnostic code it records), and for a
   * missing file inside the roots the absolute path it would have, so a caller can watch for it.
   */
  public async resolveResourceDetailed(
    request: string,
    baseDirectory: string,
    options: ResourceRequestOptions = {},
  ): Promise<ResourceResolution> {
    await this.open();
    let outcome = this.evaluate(request, baseDirectory, options, false);
    for (let attempt = 0; "need" in outcome && attempt < 3; attempt += 1) {
      await this.realFile(outcome.need);
      outcome = this.evaluate(request, baseDirectory, options, false);
    }
    return "need" in outcome ? { refusal: "missing-resource", candidate: outcome.need } : outcome;
  }

  /**
   * The decision, from the memo of file facts: a resolution, or `need` (the candidate whose file
   * facts are unknown yet). `quiet` records no diagnostic (a priming pass).
   */
  private evaluate(
    request: string,
    baseDirectory: string,
    options: ResourceRequestOptions,
    quiet: boolean,
  ): ResourceResolution | { need: string } {
    const note = (code: string, message: string): void => {
      if (!quiet) diagnostic(this.diagnostics, code, message, request);
    };
    const decoded = decodePath(resourcePathPart(request));
    if (!decoded || decoded.includes("\0") || decoded.includes("\\")) {
      note("invalid-resource-path", "The resource path could not be decoded safely.");
      return { refusal: "invalid-resource-path" };
    }

    if (
      decoded.startsWith("/") ||
      decoded.startsWith("//") ||
      schemeOf(decoded) !== undefined
    ) {
      note("blocked-resource-scheme", "Only relative resources inside the staged roots are allowed.");
      return { refusal: "blocked-resource-scheme" };
    }

    const candidate = path.resolve(baseDirectory, decoded);
    // A preview with restricted reads reaches the workspace root for images only; everything else stays in
    // the folder of the document.
    const image = options.image === true && IMAGE_EXTENSIONS.test(decoded);
    const reachable = this.restrictedReads && !image ? this.roots.filter((entry) => entry.documentFolder) : this.roots;
    const root = reachable.find((entry) => isWithin(entry.directory, candidate));
    if (!root) {
      note("resource-outside-root", "The resource is outside the staged preview roots.");
      return { refusal: "resource-outside-root" };
    }

    if (this.restrictedReads) {
      if (root.broad && !(image && root.documentFolder)) {
        note(
          "restricted-root",
          "This preview has restricted reads and is in your home folder or a file-system root, so it reads no "
          + "include or resource except the images next to the document; open a folder in the "
          + "workspace to include files.",
        );
        return { refusal: "restricted-root" };
      }
      const hidden = path.relative(root.directory, candidate).split(path.sep)
        .some((segment) => segment.startsWith("."));
      if (hidden) {
        note(
          "hidden-path",
          "A preview with restricted reads does not read paths inside dot-directories such as .ssh or .config.",
        );
        return { refusal: "hidden-path" };
      }
    }

    const known = this.fileFacts.get(candidate);
    if (known === undefined) {
      return { need: candidate };
    }
    if (known === null) {
      note("missing-resource", "The staged resource does not exist or is not a regular file.");
      return { refusal: "missing-resource", candidate };
    }
    const realCandidate = known;

    if (
      this.restrictedReads
      && path.relative(root.realDirectory, realCandidate).split(path.sep)
        .some((segment) => segment.startsWith("."))
    ) {
      note(
        "hidden-path",
        "A preview with restricted reads does not read paths inside dot-directories such as .ssh or .config.",
      );
      return { refusal: "hidden-path" };
    }

    // The image exception covers image files: a `.png` that is a link to another kind of file is
    // not served from the workspace root, nor from a broad document folder.
    if (
      this.restrictedReads
      && image
      && (!root.documentFolder || root.broad)
      && !IMAGE_EXTENSIONS.test(realCandidate)
    ) {
      note(
        "resource-outside-root",
        "A preview with restricted reads reads an image file only, and this link leads to another kind of file.",
      );
      return { refusal: "resource-outside-root" };
    }

    if (!isWithin(root.realDirectory, realCandidate)) {
      note("symlink-escape", `The resource escapes the ${root.label} root through a symlink.`);
      return { refusal: "symlink-escape" };
    }

    return { path: realCandidate };
  }

  // @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-090
  public async resolveNavigation(request: string, baseDirectory: string): Promise<NavigationResult> {
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

    const localPath = await this.resolveResource(decoded, baseDirectory);
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
export async function readBoundedText(
  policy: ResourcePolicy,
  request: string,
  baseDirectory: string,
  maxBytes = MAX_INCLUDED_FILE_BYTES,
): Promise<BoundedTextRead> {
  const resolution = await policy.resolveResourceDetailed(request, baseDirectory);
  if (!("path" in resolution)) {
    return { ok: false, refusal: resolution.refusal, ...(resolution.candidate ? { candidate: resolution.candidate } : {}) };
  }
  try {
    if ((await policy.files.stat(resolution.path)).size > maxBytes) {
      return { ok: false, refusal: "too-large" };
    }
    return { ok: true, path: resolution.path, source: new TextDecoder("utf-8", { ignoreBOM: true }).decode(await policy.files.readFile(resolution.path)) };
  } catch {
    return { ok: false, refusal: "unreadable" };
  }
}
