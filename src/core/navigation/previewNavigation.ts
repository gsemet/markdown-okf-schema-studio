
/**
 * Link classification of the preview, without any file access: anchors, external URLs, relative
 * links and wikilinks, plus the source line a Markdown fragment or marker points to. The checks
 * that read the disk are in `session/previewNavigator.ts`.
 */
import { resourcePathPart } from "../security/resource-policy";

/** Where a followed link leads: an anchor, an external URL, a local file, or nowhere (with why). */
export type PreviewNavigation =
  | { kind: "anchor"; value: string }
  | { kind: "external"; value: string }
  | { kind: "local"; path: string; suffix: string; markerLine?: number }
  | { kind: "blocked"; reason: string };

const EXTERNAL_SCHEMES = new Set(["http:", "https:", "mailto:"]);
const SCHEME_PATTERN = /^[a-z][a-z\d+.-]*:/iu;
const ANCHOR_PATTERN = /^#[^\s#?]+$/u;

/** The 1-based source lines a fragment selects (one line for a heading or a block id). */
export interface MarkdownFragmentRange {
  startLine: number;
  endLine: number;
}

/**
 * The source lines the `#fragment` of `suffix` selects in `source`: `#L3` or `#L3-L7` line ranges,
 * `#^block-id` block ids, MyST `(label)=` targets, `{#explicit-id}` heading ids or heading slugs,
 * never inside a fenced example. Undefined when there is no fragment or nothing matches.
 */
export function markdownFragmentRange(source: string, suffix: string): MarkdownFragmentRange | undefined {
  const fragment = suffix.slice(suffix.indexOf("#") + 1);
  if (!suffix.includes("#") || !fragment) return undefined;
  let target: string;
  try { target = decodeURIComponent(fragment); } catch { return undefined; }
  const lines = source.split(/\r?\n/u);
  const lineTarget = /^L([1-9]\d*)(?:-L([1-9]\d*))?$/u.exec(target);
  if (lineTarget) {
    const startLine = Number(lineTarget[1]);
    const endLine = Number(lineTarget[2] ?? lineTarget[1]);
    return startLine <= endLine && endLine <= lines.length
      ? { startLine, endLine }
      : undefined;
  }
  const blockTarget = target.startsWith("^") ? target.slice(1) : undefined;
  const slug = (value: string) => value.trim().toLowerCase().replace(/[^\p{L}\p{N}_\s-]/gu, "").replace(/\s+/gu, "-");
  let fence: string | undefined;
  for (let index = 0; index < lines.length; index += 1) {
    const marker = /^ {0,3}(`{3,}|~{3,})/u.exec(lines[index])?.[1];
    if (marker) {
      if (!fence) fence = marker;
      else if (marker[0] === fence[0] && marker.length >= fence.length) fence = undefined;
      continue;
    }
    if (fence) continue;
    // A MyST `(label)=` line is the target of `#label`.
    if (target === /^ {0,3}\(([A-Za-z0-9_.:-]+)\)=\s*$/u.exec(lines[index])?.[1]) {
      return { startLine: index + 1, endLine: index + 1 };
    }
    const blockId = /(?:^|\s)\^([^\s]+)\s*$/u.exec(lines[index])?.[1];
    if (blockTarget && blockId === blockTarget) {
      return { startLine: index + 1, endLine: index + 1 };
    }
    const htmlId = /<h[1-6]\b[^>]*\bid=["']([^"']+)["'][^>]*>/iu.exec(lines[index])?.[1];
    if (htmlId && htmlId === target) {
      return { startLine: index + 1, endLine: index + 1 };
    }
    const atx = /^ {0,3}#{1,6}\s+(.+?)\s*#*\s*$/u.exec(lines[index]);
    const heading = atx?.[1]
      ?? (/^ {0,3}(?:=+|-+)\s*$/u.test(lines[index + 1] ?? "") ? lines[index].trim() : undefined);
    const explicitId = heading?.match(/\s*\{#([^}\s]+)\}\s*$/u)?.[1];
    const headingText = heading?.replace(/\s*\{#[^}\s]+\}\s*$/u, "");
    if (heading && ((explicitId && explicitId === target) || slug(headingText ?? heading) === slug(target))) {
      return { startLine: index + 1, endLine: index + 1 };
    }
  }
  return undefined;
}

/** The first source line of {@link markdownFragmentRange}. */
export function markdownFragmentLine(source: string, suffix: string): number | undefined {
  return markdownFragmentRange(source, suffix)?.startLine;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

/** Finds the first source line containing a marker followed by an exact identity. */
export function markdownMarkerLine(
  source: string,
  marker: string,
  identity: string,
): number | undefined {
  const normalizedMarker = marker.trim();
  const normalizedIdentity = identity.trim();
  if (!normalizedMarker || !normalizedIdentity) return undefined;
  const pattern = new RegExp(
    `(?:^|\\s)${escapeRegExp(normalizedMarker)}\\s+${escapeRegExp(normalizedIdentity)}(?=$|[^\\p{L}\\p{N}_-])`,
    "u",
  );
  const lines = source.split(/\r?\n/u);
  const index = lines.findIndex((line) => pattern.test(line));
  return index < 0 ? undefined : index + 1;
}

/** A link of the page as written, before any file access: what kind of target it names. */
export type PreviewReference =
  | { kind: "anchor"; value: string }
  | { kind: "external"; value: string }
  | { kind: "relative"; value: string }
  | { kind: "wiki"; value: string }
  | { kind: "blocked"; reason: string };

/**
 * Classifies a link of the page without touching the file system: a valid anchor, an allowed
 * external URL (http, https, mailto), a relative path, a wikilink (`wiki:`), or a blocked target
 * (invalid anchor, query-only, undecodable, other scheme, absolute path) with the reason.
 */
export function classifyPreviewReference(request: string): PreviewReference {
  const trimmed = request.trim();
  if (trimmed.startsWith("#")) {
    return ANCHOR_PATTERN.test(trimmed)
      ? { kind: "anchor", value: trimmed }
      : { kind: "blocked", reason: "The preview anchor is invalid." };
  }
  if (trimmed.startsWith("?") && resourcePathPart(trimmed) === "") {
    return { kind: "blocked", reason: "Query-only navigation targets are not valid file links." };
  }
  const wiki = trimmed.startsWith("wiki:");
  const decoded = decodePath(resourcePathPart(wiki ? trimmed.slice(5) : trimmed));
  if (!decoded || decoded.includes("\0") || decoded.includes("\\")) {
    return { kind: "blocked", reason: "The navigation target could not be decoded safely." };
  }
  const scheme = schemeOf(decoded);
  if (scheme) {
    return !wiki && EXTERNAL_SCHEMES.has(scheme)
      ? { kind: "external", value: trimmed }
      : { kind: "blocked", reason: "The navigation scheme is not allowed in the preview." };
  }
  if (decoded.startsWith("/")) {
    return { kind: "blocked", reason: "Absolute navigation targets are not allowed." };
  }
  return { kind: wiki ? "wiki" : "relative", value: trimmed };
}

function schemeOf(value: string): string | undefined {
  return value.match(SCHEME_PATTERN)?.[0].toLowerCase();
}

/**
 * Decodes a percent-encoded link path (at most four rounds, for double-encoded links). Undefined
 * when the text is malformed or still holds an escape after the last round.
 */
export function decodePath(value: string): string | undefined {
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
  return /%[\da-f]{2}/iu.test(decoded) ? undefined : decoded;
}
