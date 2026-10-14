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

export function createPreviewResourcePolicy(
  documentDirectory: string,
  workspaceRoot?: string,
): ResourcePolicy {
  return new ResourcePolicy([
    { label: "preview document directory", directory: documentDirectory },
    ...(workspaceRoot ? [{ label: "workspace root", directory: workspaceRoot }] : []),
  ]);
}

export class ResourcePolicy {
  public readonly diagnostics: SecurityDiagnostic[] = [];

  private readonly roots: CanonicalRoot[];

  public constructor(roots: readonly ResourceRoot[]) {
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

  public resolveResource(request: string, baseDirectory: string): string | undefined {
    const decoded = decodePath(resourcePathPart(request));
    if (!decoded || decoded.includes("\0") || decoded.includes("\\")) {
      diagnostic(
        this.diagnostics,
        "invalid-resource-path",
        "The resource path could not be decoded safely.",
        request,
      );
      return undefined;
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
      return undefined;
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
      return undefined;
    }

    let realCandidate: string;
    try {
      if (!fs.statSync(candidate).isFile()) {
        throw new Error("resource is not a file");
      }
      realCandidate = fs.realpathSync(candidate);
    } catch {
      diagnostic(
        this.diagnostics,
        "missing-resource",
        "The staged resource does not exist or is not a regular file.",
        request,
      );
      return undefined;
    }

    if (!isWithin(root.realDirectory, realCandidate)) {
      diagnostic(
        this.diagnostics,
        "symlink-escape",
        `The resource escapes the ${root.label} root through a symlink.`,
        request,
      );
      return undefined;
    }

    return realCandidate;
  }

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

    const scheme = schemeOf(decoded);
    if (scheme) {
      if (EXTERNAL_SCHEMES.has(scheme)) {
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

export function relativeResourcePath(fromDirectory: string, resourcePath: string): string {
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
